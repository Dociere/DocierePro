const { app, BrowserWindow, ipcMain, nativeImage } = require("electron");
const path = require("path");
const { spawn, fork } = require("child_process");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const fs = require("fs-extra");

// ─── Auto Updater Configuration ────────────────────────────────────
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.allowPrerelease = true;
autoUpdater.allowDowngrade = true;

let retryDelay = 60_000; // Start retry at 1 minute
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

let backendProcess = null;
let mainWindow = null;
const ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
let splashWindow;

const platform = process.platform;
const archFolder =
  platform === "win32"
    ? "windows"
    : platform === "darwin"
    ? "universal-darwin"
    : "x86_64-linux";
const binaryName = platform === "win32" ? "pdflatex.exe" : "pdflatex";

const isDev = !app.isPackaged;

async function runSetupTinyTex(userDataPath, isDev, onProgress) {
  const { setupTinyTex } = await import("../scripts/setup-tinytex.js");
  await setupTinyTex(userDataPath, isDev, onProgress);
}

async function runSetupExtraPackages(userDataPath, isDev, onProgress) {
  const { setupExtraPackages } = await import("../scripts/setup-init-pkg.js");
  await setupExtraPackages(userDataPath, isDev, onProgress);
}

// function getSidecarPath() {
//   const isDev = !app.isPackaged;
//   const platform = process.platform;

//   // Binary name is platform-dependent
//   const binaryName = platform === "win32" ? "sidecar.exe" : "sidecar";

//   if (isDev) {
//     // __dirname is application/electron, so we go up one level to application/sidecar
//     return path.join(__dirname, "..", "sidecar", "build", binaryName);
//   }

//   return path.join(process.resourcesPath, "bin", binaryName);
// }

// function startSidecar(userDataPath) {
//   const sidecarBin = getSidecarPath();
//   const platform = process.platform;
//   const libsDir = !app.isPackaged
//     ? path.join(__dirname, "..", "sidecar", "build", "libs")
//     : path.join(process.resourcesPath, "bin", "libs");

//   const ldPath =
//     platform === "linux"
//       ? `${libsDir}${path.delimiter}${process.env.LD_LIBRARY_PATH || ""}`
//       : process.env.LD_LIBRARY_PATH;

//   const sidecarProcess = spawn(sidecarBin, [], {
//     cwd: userDataPath,
//     stdio: ["pipe", "pipe", "inherit"],
//     env: {
//       ...process.env,
//       USER_DATA_PATH: userDataPath,
//       ...(platform === "linux" && { LD_LIBRARY_PATH: ldPath }),
//     },
//   });

//   sidecarProcess.on("error", (err) => {
//     console.error("Sidecar failed to start:", err);
//   });

//   sidecarProcess.on("exit", (code) => {
//     console.log("Sidecar exited with code:", code);
//   });

//   return sidecarProcess;
// }

function startBackend() {
  const isDev = !app.isPackaged;
  const userDataPath = app.getPath("userData");

  if (isDev) {
    // startSidecar(userDataPath);
  } else {
    const backendPath = path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "server.js",
    );

    const resourcesPath = path.join(userDataPath, "resources");

    const latexBinPath = path.join(
      userDataPath,
      "resources",
      "TinyTex",
      platform === "win32" ? "win" : platform === "darwin" ? "mac" : "linux",
      "bin",
      archFolder,
    );

    backendProcess = fork(backendPath, [], {
      cwd: userDataPath,
      stdio: "inherit",
      env: {
        ...process.env,
        USER_DATA_PATH: userDataPath,
        PATH: `${latexBinPath}${path.delimiter}${process.env.PATH}`,
        RESOURCES_PATH: resourcesPath,
        envEncryptionKey: ENCRYPTION_KEY,
      },
    });

    // startSidecar(userDataPath);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    icon: path.join(__dirname, "../public/dociereLogo6.png"),
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    // mainWindow.webContents.openDevTools();
  } else {
    // mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    const filePath = path.join(__dirname, "../dist/index.html");
    console.log("Loading file:", filePath);
    console.log("File exists:", require("fs").existsSync(filePath));
    mainWindow.loadFile(filePath);
    // mainWindow.webContents.openDevTools();
  }

  mainWindow.setMenu(null);

  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window-is-maximized");
  });
  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window-is-unmaximized");
  });
}

function createSplashWindow(isFirstRun) {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const splashPath = path.join(__dirname, "../public/splash.html");
  splashWindow.loadURL(`file://${splashPath}?firstRun=${isFirstRun}`);
}

app.whenReady().then(async () => {
  const fs = require("fs-extra");
  const userDataPath = app.getPath("userData");
  const isDev = !app.isPackaged;
  const checkDir = isDev ? process.cwd() : userDataPath;

  const pdflatexPath = path.join(
    checkDir,
    "resources",
    "TinyTex",
    platform === "win32" ? "win" : platform === "darwin" ? "mac" : "linux",
    "bin",
    archFolder,
    binaryName,
  );

  console.log("pdflatexPath from main.cjs", pdflatexPath);
  console.log("userDataPath from main.cjs", userDataPath);
  console.log("checkDir from main.cjs", checkDir);

  const isFirstRun = !require("fs").existsSync(pdflatexPath);
  createSplashWindow(isFirstRun);

  // 1. ALWAYS ensure essential folders exist in userDataPath (Dev & Prod)
  const unpackedPath = isDev
    ? process.cwd()
    : path.join(process.resourcesPath, "app.asar.unpacked");
  const asarFolders = ["projects", "templates", "user-templates", "settings"];

  for (const folder of asarFolders) {
    const dest = path.join(userDataPath, folder);
    const src = path.join(unpackedPath, folder);
    if (fs.existsSync(src)) {
      // If destination doesn't exist, OR it exists but is empty, copy it.
      // This handles cases where server.js might have created an empty folder first.
      const shouldCopy =
        !fs.existsSync(dest) ||
        (fs.lstatSync(dest).isDirectory() && fs.readdirSync(dest).length === 0);
      if (shouldCopy) {
        await fs.copy(src, dest);
      }
    }
  }

  // 2. ONLY run the heavy LaTeX setup if packaged (or if you want to test it in Dev)
  // if (!isDev) {
  //   await setupTinyTex(userDataPath);
  // }

  await runSetupTinyTex(userDataPath, isDev, (msg) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("setup-progress", msg);
    }
  });
  startBackend();
  createWindow();

  mainWindow.once("ready-to-show", () => {
    splashWindow.close();
    mainWindow.show();

    // Start background package installation after the window is shown
    runSetupExtraPackages(userDataPath, isDev, (msg) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("setup-progress", msg);
      }
    });

    // ─── OTA: Deferred startup update check ───────────────────────
    setTimeout(() => {
      try {
        const pendingVersion = readUpdateSetting("pendingVersion");
        if (pendingVersion) {
          // A downloaded update is already waiting — surface it immediately
          mainWindow.webContents.send("update-downloaded", {
            version: pendingVersion,
            releaseNotes: readUpdateSetting("pendingReleaseNotes") || "",
          });
          return;
        }
        const autoCheck = readUpdateSetting("autoCheck");
        if (autoCheck !== false) {
          autoUpdater.checkForUpdates().catch((err) => {
            log.error("Startup update promise rejected:", err);
          });
        }
      } catch (err) {
        log.error("Startup update check failed:", err);
      }
    }, 8000);

    // ─── OTA: Periodic background polling (every 4 hours) ─────────
    setInterval(() => {
      try {
        const autoCheck = readUpdateSetting("autoCheck");
        if (autoCheck !== false) {
          autoUpdater.checkForUpdates().catch((err) => {
            log.error("Periodic update promise rejected:", err);
          });
        }
      } catch (err) {
        log.error("Periodic update check failed:", err);
      }
    }, FOUR_HOURS_MS);
  });
});

app.on("window-all-closed", () => {
  // Kill backend process when app closes
  if (backendProcess) {
    backendProcess.kill();
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("window-minimize", () => mainWindow.minimize());
ipcMain.on("window-maximize", () =>
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(),
);
ipcMain.on("window-close", () => mainWindow.close());

ipcMain.handle("save-pdf", async (event, { arrayBuffer, defaultName }) => {
  const { dialog } = require("electron");

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: "Export PDF",
    defaultPath: defaultName || "document.pdf",
    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
  });

  if (canceled || !filePath) {
    return { success: false, canceled: true };
  }

  try {
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);
    return { success: true, filePath };
  } catch (error) {
    console.error("Failed to save PDF:", error);
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════════════════
// ─── OTA Update System ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// ─── Utility: Read/write update settings from config.json ─────────
function getSettingsPath() {
  const userDataPath = app.getPath("userData");
  const settingsDir = isDev
    ? process.cwd()
    : path.join(userDataPath, "settings");
  return path.join(settingsDir, "config.json");
}

function readUpdateSetting(key) {
  try {
    const configPath = getSettingsPath();
    if (!fs.existsSync(configPath)) return undefined;
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return config?.updates?.[key];
  } catch (err) {
    log.error("Failed to read update setting:", err);
    return undefined;
  }
}

function writeUpdateSetting(key, value) {
  try {
    const configPath = getSettingsPath();
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
    if (!config.updates) config.updates = {};
    config.updates[key] = value;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    log.error("Failed to write update setting:", err);
  }
}

function clearOSBadges() {
  if (process.platform === "darwin" && app.dock) {
    app.dock.setBadge("");
  }
  if (process.platform === "win32" && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setOverlayIcon(null, "");
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────
ipcMain.handle("check-for-updates", async () => {
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    log.error("Manual update check failed:", err);
  }
});

ipcMain.handle("download-update", async () => {
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    log.error("Download update failed:", err);
  }
});

ipcMain.on("install-update", () => {
  writeUpdateSetting("pendingVersion", null);
  writeUpdateSetting("pendingReleaseNotes", null);
  clearOSBadges();
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.on("dismiss-update-badge", () => {
  clearOSBadges();
});

// ─── autoUpdater Event Forwarding ─────────────────────────────────
autoUpdater.on("checking-for-update", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("checking-for-update");
  }
});

autoUpdater.on("update-available", (info) => {
  retryDelay = 60_000;
  writeUpdateSetting("lastCheckedAt", new Date().toISOString());
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-available", {
      version: info.version,
      releaseNotes: info.releaseNotes || "",
      releaseDate: info.releaseDate || "",
    });
  }
});

autoUpdater.on("update-not-available", (info) => {
  retryDelay = 60_000;
  writeUpdateSetting("lastCheckedAt", new Date().toISOString());
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-not-available", {
      version: info.version,
    });
  }
});

autoUpdater.on("download-progress", (progressObj) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("download-progress", {
      percent: Math.floor(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  }
});

autoUpdater.on("update-downloaded", (info) => {
  writeUpdateSetting("pendingVersion", info.version);
  writeUpdateSetting("pendingReleaseNotes", info.releaseNotes || "");

  // macOS dock badge
  if (process.platform === "darwin" && app.dock) {
    app.dock.setBadge("↑");
  }

  // Windows taskbar overlay
  if (process.platform === "win32" && mainWindow && !mainWindow.isDestroyed()) {
    try {
      const badgePath = path.join(__dirname, "../public/dociereLogo6.png");
      mainWindow.setOverlayIcon(
        nativeImage.createFromPath(badgePath),
        "Update ready to install",
      );
    } catch (e) {
      log.warn("Failed to set taskbar overlay:", e);
    }
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-downloaded", {
      version: info.version,
      releaseNotes: info.releaseNotes || "",
    });
  }
});

autoUpdater.on("error", (err) => {
  log.error("Auto-update error:", err);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-error", {
      message: err?.message || String(err),
    });
  }
  // Retry with exponential backoff (max 4 hours)
  const nextRetry = Math.min(retryDelay * 2, FOUR_HOURS_MS);
  retryDelay = nextRetry;
  setTimeout(() => {
    try {
      const autoCheck = readUpdateSetting("autoCheck");
      if (autoCheck !== false) {
        autoUpdater.checkForUpdates().catch((err) => {
          log.error("Retry update promise rejected:", err);
        });
      }
    } catch (e) {
      log.error("Retry update check failed:", e);
    }
  }, nextRetry);
});
