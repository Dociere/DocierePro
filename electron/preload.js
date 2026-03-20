const { ipcRenderer, contextBridge } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
  console.log("Electron preload loaded");
});

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  onMaximize: (callback) =>
    ipcRenderer.on("window-is-maximized", () => callback()),
  onUnmaximize: (callback) =>
    ipcRenderer.on("window-is-unmaximized", () => callback()),

  extensions: {
    getInstalled: () => ipcRenderer.invoke("extensions:get-installed"),
    install: (id, url) => ipcRenderer.invoke("extensions:install", { id, url }),
    uninstall: (id) => ipcRenderer.invoke("extensions:uninstall", id),
    openWindow: (url, title) => ipcRenderer.send("extensions:open-window", { url, title }),
  },
});
