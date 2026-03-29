import React, { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { useSettings } from "../context/useSettings";

export const useYjsMonaco = (
  projectId,
  token,
  isOnline,
  monacoEditor,
  user,
) => {
  const ydoc = useRef(new Y.Doc());
  const wsProvider = useRef(null);
  const binding = useRef(null);
  const [users, setUsers] = useState([]);
  const [syncStatus, setSyncStatus] = useState("loading");
  const { settings } = useSettings();
  const mode = settings.server.mode;
  const ws_url = settings.server.methods[mode].webSocketServer;

  useEffect(() => {
    if (!projectId || !token || !monacoEditor) {
      console.log("⏭️ Yjs: Missing requirements", {
        projectId,
        token: !!token,
        monacoEditor: !!monacoEditor,
      });
      return;
    }

    console.log("🚀 Initializing Yjs for project:", projectId);

    const ytext = ydoc.current.getText("monaco");
    // const wsUrl =
    //   localStorage.getItem(`project_${projectId}_ws`) ||
    //   `${import.meta.env.VITE_ws_server}`;

    const wsUrl =
      localStorage.getItem(`project_${projectId}_ws`) || `${ws_url}`;

    const guestToken = localStorage.getItem(`project_${projectId}_guest_token`);
    const effectiveToken = guestToken || token;
    if (
      !projectId ||
      !monacoEditor ||
      !effectiveToken ||
      effectiveToken === "null" ||
      effectiveToken === "undefined"
    ) {
      console.log("⏸️ Yjs: Waiting for valid token...");
      return;
    }
    console.log(
      "🚀 Initializing Yjs with token:",
      effectiveToken.substring(0, 10) + "...",
    );
    console.log("📡 WebSocket URL:", wsUrl);

    // WebSocket
    if (isOnline) {
      console.log("🔌 Connecting to WebSocket...", wsUrl);

      wsProvider.current = new WebsocketProvider(
        wsUrl,
        `project:${projectId}`,
        ydoc.current,
        {
          params: {
            token: effectiveToken,
            projectId: projectId,
          },
        },
      );

      wsProvider.current.on("status", (event) => {
        console.log("📶 WebSocket status:", event.status);
        setSyncStatus(
          event.status === "connected" ? "connected" : "disconnected",
        );
      });

      wsProvider.current.on("sync", (isSynced) => {
        console.log("🔄 WebSocket sync:", isSynced);
        if (isSynced) {
          setSyncStatus("synced");
        }
      });

      wsProvider.current.on("connection-error", (error) => {
        console.error("❌ WebSocket connection error:", error);
      });

      wsProvider.current.on("connection-close", (event) => {
        console.warn("⚠️ WebSocket connection closed:", event);
      });

      // Awareness
      const awareness = wsProvider.current.awareness;

      const getUserInfo = () => {
        const isGuest =
          localStorage.getItem(`project_${projectId}_guest`) === "true";

        // Priority 1: Use passed user object (Owner/Authenticated)
        if (user && !isGuest) {
          return {
            name: user.userName || user.emailId || "Authenticated User",
            color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            isGuest: false,
          };
        }

        const userStr = localStorage.getItem("user");

        if (isGuest) {
          return {
            name: "Guest User",
            color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            isGuest: true,
          };
        } else if (userStr) {
          try {
            const localUser = JSON.parse(userStr);
            return {
              name: localUser.userName || localUser.emailId,
              color: "#" + Math.floor(Math.random() * 16777215).toString(16),
              isGuest: false,
            };
          } catch (e) {
            console.error("Error parsing local user", e);
          }
        }
        return {
          name: "Anonymous",
          color: "#888888",
          isGuest: true,
        };
      };

      awareness.setLocalStateField("user", getUserInfo());
      console.log("👤 User info set:", getUserInfo());

      awareness.on("change", () => {
        const states = Array.from(awareness.getStates().values());
        const activeUsers = states.filter((state) => state.user);
        setUsers(activeUsers);
        console.log(
          "👥 Active users:",
          activeUsers.length,
          activeUsers.map((u) => u.user.name),
        );
      });
    }

    // Bind to Monaco
    console.log("🔗 Binding Yjs to Monaco editor");
    // NOTE: Do NOT insert initial content here - let the server sync provide the content
    // The owner's content should be pushed to the server when they first save/connect

    binding.current = new MonacoBinding(
      ytext,
      monacoEditor.getModel(),
      new Set([monacoEditor]),
      wsProvider.current?.awareness,
    );

    console.log("✅ Yjs initialization complete");

    return () => {
      console.log("🧹 Cleaning up Yjs");
      binding.current?.destroy();
      wsProvider.current?.destroy();
    };
  }, [projectId, token, isOnline, monacoEditor, user]);

  return { ydoc: ydoc.current, users, syncStatus };
};
