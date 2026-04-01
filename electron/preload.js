const { ipcRenderer, contextBridge } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
  console.log("Electron preload loaded");
});

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  minimizeSplash: () => ipcRenderer.send("splash-minimize"),
  quitApp: () => ipcRenderer.send("app-quit"),
  onMaximize: (callback) =>
    ipcRenderer.on("window-is-maximized", () => callback()),
  onUnmaximize: (callback) =>
    ipcRenderer.on("window-is-unmaximized", () => callback()),
  onSetupProgress: (callback) => {
    const subscription = (event, msg) => callback(msg);
    ipcRenderer.on("setup-progress", subscription);
    return () => ipcRenderer.removeListener("setup-progress", subscription);
  },
  savePDF: (arrayBuffer, defaultName) =>
    ipcRenderer.invoke("save-pdf", { arrayBuffer, defaultName }),

  // ─── OTA Update Actions ─────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  installUpdate: () => ipcRenderer.send("install-update"),
  dismissUpdateBadge: () => ipcRenderer.send("dismiss-update-badge"),

  // ─── OTA Update Listeners (with cleanup) ────────────────────────
  onCheckingForUpdate: (cb) => {
    const handler = () => cb();
    ipcRenderer.on("checking-for-update", handler);
    return () => ipcRenderer.removeListener("checking-for-update", handler);
  },
  onUpdateAvailable: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on("update-available", handler);
    return () => ipcRenderer.removeListener("update-available", handler);
  },
  onUpdateNotAvailable: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on("update-not-available", handler);
    return () => ipcRenderer.removeListener("update-not-available", handler);
  },
  onDownloadProgress: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on("download-progress", handler);
    return () => ipcRenderer.removeListener("download-progress", handler);
  },
  onUpdateDownloaded: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on("update-downloaded", handler);
    return () => ipcRenderer.removeListener("update-downloaded", handler);
  },
  onUpdateError: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on("update-error", handler);
    return () => ipcRenderer.removeListener("update-error", handler);
  },
});
