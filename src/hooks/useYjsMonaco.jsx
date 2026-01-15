import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import { MonacoBinding } from "y-monaco";

export const useYjsMonaco = (projectId, token, isOnline, monacoEditor) => {
  const ydoc = useRef(new Y.Doc());
  const wsProvider = useRef(null);
  const indexeddbProvider = useRef(null);
  const binding = useRef(null);

  useEffect(() => {
    if (!projectId || !token || !monacoEditor) return;

    const ytext = ydoc.current.getText("monaco");

    // IndexedDB for offline persistence
    indexeddbProvider.current = new IndexeddbPersistence(
      `project-${projectId}`,
      ydoc.current
    );

    // WebSocket for online collaboration
    if (isOnline) {
      wsProvider.current = new WebsocketProvider(
        "ws://localhost:5001",
        `project:${projectId}`,
        ydoc.current,
        { params: { token } }
      );
    }

    // Bind Yjs to Monaco
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

  return {
    ydoc: ydoc.current,
    provider: wsProvider.current,
  };
};
