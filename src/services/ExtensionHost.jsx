import React, { useEffect, useState } from "react";

/**
 * ExtensionHost Component
 * Handles the mounting of sandboxed iframes for active extensions.
 * Listens for dociere-extensions-refresh to reload if needed.
 */
const ExtensionHost = ({ activeExtensionId }) => {
  const [activeExtensions, setActiveExtensions] = useState([]);

  useEffect(() => {
    const loadExtensions = async () => {
      if (window.electronAPI && window.electronAPI.extensions) {
        try {
          const installed = await window.electronAPI.extensions.getInstalled();
          setActiveExtensions(installed);
        } catch (err) {
          console.error("Failed to load extensions in host", err);
        }
      }
    };

    loadExtensions();

    // Listen for refresh events (when extensions are installed/uninstalled)
    const handleRefresh = () => loadExtensions();
    window.addEventListener("dociere-extensions-refresh", handleRefresh);

    return () => {
      window.removeEventListener("dociere-extensions-refresh", handleRefresh);
    };
  }, []);

  useEffect(() => {
    // Broadcast loaded extensions to the sidebar
    if (activeExtensions.length > 0) {
      window.dispatchEvent(new CustomEvent("dociere-extensions-loaded", { 
        detail: activeExtensions 
      }));
    }
  }, [activeExtensions]);

  // Activate the extension when it becomes visible
  useEffect(() => {
    if (activeExtensionId) {
      const iframe = document.getElementById(`ext-${activeExtensionId}`);
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ type: "dociere:activate" }, "*");
        } catch (e) {
          console.error("Could not post message to extension iframe", e);
        }
      }
    }
  }, [activeExtensionId]);

  useEffect(() => {
    const channel = new BroadcastChannel("dociere-extensions");
    
    const handleMessageEvent = (eventData) => {
      const { type, payload } = eventData || {};
      if (!type || !type.startsWith("dociere:")) return;

      console.log(`[ExtensionHost] ${channel.name} Received: ${type}`, payload);

      if (type === "dociere:insert") {
        window.dispatchEvent(new CustomEvent("dociere-insert-text", { detail: payload }));
      } else if (type === "dociere:show-info") {
        window.dispatchEvent(new CustomEvent("dociere-show-toast", { detail: { type: "info", ...payload } }));
      } else if (type === "dociere:popout") {
        console.log("[ExtensionHost] Popout request received", payload);
        if (window.electronAPI && window.electronAPI.extensions && window.electronAPI.extensions.openWindow) {
          const url = payload.url || `http://localhost:5000/api/extensions/load/${payload.id}/index.html`;
          console.log("[ExtensionHost] Opening window with URL:", url);
          window.electronAPI.extensions.openWindow(url, payload.title || "Extension");
          
          window.dispatchEvent(new CustomEvent("dociere-toggle-extension", { 
            detail: { id: payload.id, visible: false } 
          }));
        } else {
          console.error("[ExtensionHost] window.electronAPI.extensions.openWindow is NOT defined! Did you restart Electron?");
          window.dispatchEvent(new CustomEvent("dociere-show-toast", { 
            detail: { type: "error", message: "Electron window API not found. Please restart the entire app." } 
          }));
        }
      }
    };

    // Handle messages from IFRAMEs in the same window
    const handleIframeMessage = (event) => handleMessageEvent(event.data);
    
    // Handle messages from OTHER WINDOWS via BroadcastChannel
    channel.onmessage = (event) => handleMessageEvent(event.data);

    window.addEventListener("message", handleIframeMessage);
    
    return () => {
      window.removeEventListener("message", handleIframeMessage);
      channel.close();
    };
  }, []);

  return (
    <div id="extension-host-container" className="w-full h-full">
      {activeExtensions.map((ext) => (
        <iframe
          key={ext.id}
          id={`ext-${ext.id}`}
          title={ext.name}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          src={`http://localhost:5000/api/extensions/load/${ext.id}/${ext.main || "index.html"}`}
          onLoad={() => console.log(`[ExtensionHost] Iframe loaded: ${ext.id}`)}
          onError={(e) => console.error(`[ExtensionHost] Iframe error: ${ext.id}`, e)}
          style={{ 
            display: activeExtensionId === ext.id ? "block" : "none", 
            width: "100%", 
            height: "100%", 
            border: "none",
            backgroundColor: "white"
          }}
        />
      ))}
    </div>
  );
};

export default ExtensionHost;
