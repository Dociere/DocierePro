import React, { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

// export const useYjsMonaco = (projectId, token, isOnline, monacoEditor) => {
//   const ydoc = useRef(new Y.Doc());
//   const [users, setUsers] = useState([]);
//   const [syncStatus, setSyncStatus] = useState("loading");

//   useEffect(() => {
//     if (!projectId || !token || !monacoEditor) return;

//     const ytext = ydoc.current.getText("monaco");
//     const wsUrl =
//       localStorage.getItem(`project_${projectId}_ws`) || "ws://localhost:5001";

//     // IndexedDB
//     indexeddbProvider.current = new IndexeddbPersistence(
//       `project-${projectId}`,
//       ydoc.current
//     );

//     indexeddbProvider.current.on("synced", () => {
//       console.log("✓ Local data loaded");
//       setSyncStatus("local-loaded");
//     });

//     // WebSocket
//     if (isOnline) {
//       wsProvider.current = new WebsocketProvider(
//         wsUrl,
//         `project:${projectId}`,
//         ydoc.current,
//         { params: { token } }
//       );

//       wsProvider.current.on("sync", (isSynced) => {
//         if (isSynced) {
//           console.log("✓ Synced with server");
//           setSyncStatus("synced");
//         }
//       });

//       // Track users with Awareness
//       const awareness = wsProvider.current.awareness;

//       // Get user info from auth or guest
//       const getUserInfo = () => {
//         const isGuest =
//           localStorage.getItem(`project_${projectId}_guest`) === "true";
//         const userStr = localStorage.getItem("user");

//         if (isGuest) {
//           return {
//             name: "Guest User",
//             color: "#" + Math.floor(Math.random() * 16777215).toString(16),
//             isGuest: true,
//           };
//         } else if (userStr) {
//           const user = JSON.parse(userStr);
//           return {
//             name: user.userName || user.emailId,
//             color: "#" + Math.floor(Math.random() * 16777215).toString(16),
//             isGuest: false,
//           };
//         }
//         return {
//           name: "Anonymous",
//           color: "#888888",
//           isGuest: true,
//         };
//       };

//       // Set local user
//       awareness.setLocalStateField("user", getUserInfo());

//       // Track other users
//       awareness.on("change", () => {
//         const states = Array.from(awareness.getStates().values());
//         const activeUsers = states.filter((state) => state.user);
//         setUsers(activeUsers);
//         console.log("Active users:", activeUsers);
//       });
//     }

//     // Bind to Monaco
//     binding.current = new MonacoBinding(
//       ytext,
//       monacoEditor.getModel(),
//       new Set([monacoEditor]),
//       wsProvider.current?.awareness
//     );

//     return () => {
//       binding.current?.destroy();
//       wsProvider.current?.destroy();
//       indexeddbProvider.current?.destroy();
//     };
//   }, [projectId, token, isOnline, monacoEditor]);

//   return { ydoc: ydoc.current, users, syncStatus };
// };

export const useYjsMonaco = (projectId, token, isOnline, monacoEditor, user) => {
  const ydoc = useRef(new Y.Doc());
  const wsProvider = useRef(null);
  const binding = useRef(null);
  const [users, setUsers] = useState([]);
  const [syncStatus, setSyncStatus] = useState("loading");

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
    const wsUrl =
      localStorage.getItem(`project_${projectId}_ws`) ||
      `${import.meta.env.VITE_ws_server}`;
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
    // console.log("🎫 Guest token:", guestToken ? "present" : "none");

    // IndexedDB
    // indexeddbProvider.current = new IndexeddbPersistence(
    //   `project-${projectId}`,
    //   ydoc.current,
    // );

    // indexeddbProvider.current.on("synced", () => {
    //   console.log("💾 IndexedDB synced");
    //   setSyncStatus("local-loaded");
    // });

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
                isGuest: false
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
          } catch(e) {
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
    if (ytext.length === 0) {
      ytext.insert(0, monacoEditor.getValue());
    }

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
