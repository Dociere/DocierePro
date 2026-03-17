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
  onSetupProgress: (callback) =>
    ipcRenderer.on("setup-progress", (event, msg) => callback(msg)),
  savePDF: (arrayBuffer, defaultName) =>
    ipcRenderer.invoke("save-pdf", { arrayBuffer, defaultName }),
});
