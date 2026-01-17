import React, { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import { MonacoBinding } from "y-monaco";

export const useYjsMonaco = (projectId, token, isOnline, monacoEditor) => {
  const ydoc = useRef(new Y.Doc());
  const [users, setUsers] = useState([]);
  const [syncStatus, setSyncStatus] = useState("loading");

  useEffect(() => {
    if (!projectId || !token || !monacoEditor) return;

    const ytext = ydoc.current.getText("monaco");
    const wsUrl =
      localStorage.getItem(`project_${projectId}_ws`) || "ws://localhost:5001";

    // IndexedDB
    indexeddbProvider.current = new IndexeddbPersistence(
      `project-${projectId}`,
      ydoc.current
    );

    indexeddbProvider.current.on("synced", () => {
      console.log("✓ Local data loaded");
      setSyncStatus("local-loaded");
    });

    // WebSocket
    if (isOnline) {
      wsProvider.current = new WebsocketProvider(
        wsUrl,
        `project:${projectId}`,
        ydoc.current,
        { params: { token } }
      );

      wsProvider.current.on("sync", (isSynced) => {
        if (isSynced) {
          console.log("✓ Synced with server");
          setSyncStatus("synced");
        }
      });

      // Track users with Awareness
      const awareness = wsProvider.current.awareness;

      // Get user info from auth or guest
      const getUserInfo = () => {
        const isGuest =
          localStorage.getItem(`project_${projectId}_guest`) === "true";
        const userStr = localStorage.getItem("user");

        if (isGuest) {
          return {
            name: "Guest User",
            color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            isGuest: true,
          };
        } else if (userStr) {
          const user = JSON.parse(userStr);
          return {
            name: user.userName || user.emailId,
            color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            isGuest: false,
          };
        }
        return {
          name: "Anonymous",
          color: "#888888",
          isGuest: true,
        };
      };

      // Set local user
      awareness.setLocalStateField("user", getUserInfo());

      // Track other users
      awareness.on("change", () => {
        const states = Array.from(awareness.getStates().values());
        const activeUsers = states.filter((state) => state.user);
        setUsers(activeUsers);
        console.log("Active users:", activeUsers);
      });
    }

    // Bind to Monaco
    binding.current = new MonacoBinding(
      ytext,
      monacoEditor.getModel(),
      new Set([monacoEditor]),
      wsProvider.current?.awareness
    );

    return () => {
      binding.current?.destroy();
      wsProvider.current?.destroy();
      indexeddbProvider.current?.destroy();
    };
  }, [projectId, token, isOnline, monacoEditor]);

  return { ydoc: ydoc.current, users, syncStatus };
};
