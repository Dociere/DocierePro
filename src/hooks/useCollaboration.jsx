import { useEffect, useState, useRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";

export const useCollaboration = (projectId, token, isOnline) => {
  const [ydoc] = useState(() => new Y.Doc());
  const [yText, setYText] = useState(null);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);

  const wsProvider = useRef(null);
  const indexeddbProvider = useRef(null);

  useEffect(() => {
    if (!projectId || !token) return;

    // Initialize Yjs text type
    const text = ydoc.getText("content");
    setYText(text);

    // Setup IndexedDB for offline persistence
    indexeddbProvider.current = new IndexeddbPersistence(
      `project-${projectId}`,
      ydoc,
    );

    indexeddbProvider.current.on("synced", () => {
      console.log("Local content loaded from IndexedDB");
    });

    // Setup WebSocket provider for real-time sync (only when online)
    if (isOnline) {
      wsProvider.current = new WebsocketProvider(
        `${import.meta.env.VITE_ws_server}`,
        `project:${projectId}`,
        ydoc,
        {
          params: { token },
        },
      );

      wsProvider.current.on("status", (event) => {
        setConnected(event.status === "connected");
        console.log("WebSocket status:", event.status);
      });

      wsProvider.current.on("sync", (isSynced) => {
        if (isSynced) {
          console.log("Synced with server");
        }
      });

      // Awareness - track other users
      const awareness = wsProvider.current.awareness;

      awareness.on("change", () => {
        const states = Array.from(awareness.getStates().values());
        setUsers(states.filter((state) => state.user));
      });

      // Set local user info
      awareness.setLocalStateField("user", {
        name: "Current User", // Get from auth context
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      });
    }

    return () => {
      wsProvider.current?.destroy();
      indexeddbProvider.current?.destroy();
    };
  }, [projectId, token, isOnline, ydoc]);

  const syncWithServer = async () => {
    if (wsProvider.current && !connected) {
      wsProvider.current.connect();
    }
  };

  return {
    ydoc,
    yText,
    connected,
    users,
    syncWithServer,
  };
};
