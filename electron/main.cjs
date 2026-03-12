const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let backendProcess = null;
let mainWindow = null;

function startBackend() {
  const isDev = !app.isPackaged;
  const userDataPath = app.getPath("userData");

  if (isDev) {
    backendProcess = spawn("npm", ["start"], {
      shell: true,
      cwd: __dirname.replace("/electron", ""),
      stdio: "inherit",
      env: { ...process.env, USER_DATA_PATH: userDataPath },
    });
  } else {
    const backendPath = path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "server.js",
    );
    backendProcess = spawn("node", [backendPath], {
      // cwd: path.join(process.resourcesPath, "app.asar.unpacked"),
      cwd: userDataPath,
      stdio: "inherit",
      env: {
        ...process.env,
        USER_DATA_PATH: userDataPath,
        // RESOURCES_PATH: process.resourcesPath,
        RESOURCES_PATH: userDataPath,
      },
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "../public/dociereLogo6.png"),
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // const isDev = process.env.NODE_ENV === "development";
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    // mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    const filePath = path.join(__dirname, "../dist/index.html");
    console.log("Loading file:", filePath);
    console.log("File exists:", require("fs").existsSync(filePath));
    mainWindow.loadFile(filePath);
    mainWindow.webContents.openDevTools();
  }

  mainWindow.setMenu(null);

  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window-is-maximized");
  });
  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window-is-unmaximized");
  });
}

// app.whenReady().then(() => {
//   startBackend();

//   // Wait a bit for backend to start before opening window
//   setTimeout(createWindow, 2000);
// });

app.whenReady().then(async () => {
  const fs = require("fs-extra");
  const userDataPath = app.getPath("userData");

  // The code/server.js is in app.asar.unpacked
  const unpackedPath = path.join(process.resourcesPath, "app.asar.unpacked");
  // TinyTex is directly in resources
  const resourcesPath = process.resourcesPath;

  if (app.isPackaged) {
    // 1. Handle folders from extraResources (Directly in resources)
    const extraFolders = ["TinyTex"];
    for (const folder of extraFolders) {
      const dest = path.join(userDataPath, folder);
      const src = path.join(resourcesPath, folder);
      if (!fs.existsSync(dest) && fs.existsSync(src)) {
        await fs.copy(src, dest);
      }
    }

    // 2. Handle folders from asarUnpack (Inside app.asar.unpacked)
    const asarFolders = ["projects", "templates", "settings"];
    for (const folder of asarFolders) {
      const dest = path.join(userDataPath, folder);
      const src = path.join(unpackedPath, folder);
      if (!fs.existsSync(dest) && fs.existsSync(src)) {
        await fs.copy(src, dest);
      }
    }
  }

  startBackend();
  setTimeout(createWindow, 2000);
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
