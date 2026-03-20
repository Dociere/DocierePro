const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs-extra");
const axios = require("axios");
const extract = require("extract-zip");

let backendProcess = null;
let mainWindow = null;

function startBackend() {
  const isDev = !app.isPackaged;
  const userDataPath = app.getPath("userData"); // get it here in main process

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
      cwd: path.join(process.resourcesPath, "app.asar.unpacked"),
      stdio: "inherit",
      env: { ...process.env, USER_DATA_PATH: userDataPath }, // pass it here
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "../public/dociereLogo9.png"),
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

app.whenReady().then(() => {
  startBackend();

  // Wait a bit for backend to start before opening window
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

const getExtensionsDir = () => path.join(app.getPath("userData"), "extensions");

ipcMain.handle("extensions:get-installed", async () => {
  const dir = getExtensionsDir();
  await fs.ensureDir(dir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const extensions = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const manifestPath = path.join(dir, entry.name, "dociere-extension.json");
      if (await fs.pathExists(manifestPath)) {
        try {
          const manifest = await fs.readJSON(manifestPath);
          extensions.push({ id: entry.name, ...manifest });
        } catch (e) {
          console.error(`Failed to read manifest for ${entry.name}`, e);
        }
      }
    }
  }
  return extensions;
});

ipcMain.handle("extensions:install", async (event, { id, url }) => {
  const dir = getExtensionsDir();
  const targetDir = path.join(dir, id);
  const tempZip = path.join(app.getPath("temp"), `${id}_${Date.now()}.zip`);

  try {
    await fs.ensureDir(dir);
    
    // Download ZIP
    const response = await axios({
      method: "get",
      url: url,
      responseType: "stream",
    });

    const writer = fs.createWriteStream(tempZip);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Extract ZIP
    if (await fs.pathExists(targetDir)) {
      await fs.remove(targetDir);
    }
    await fs.ensureDir(targetDir);
    
    await extract(tempZip, { dir: targetDir });
    
    // Cleanup
    await fs.remove(tempZip);

    // Read manifest to return
    const manifestPath = path.join(targetDir, "dociere-extension.json");
    if (await fs.pathExists(manifestPath)) {
      return await fs.readJSON(manifestPath);
    }
    return { id, success: true };
  } catch (error) {
    console.error(`Failed to install extension ${id}`, error);
    if (tempZip && await fs.pathExists(tempZip)) await fs.remove(tempZip);
    throw error;
  }
});

ipcMain.handle("extensions:uninstall", async (event, id) => {
  const targetDir = path.join(getExtensionsDir(), id);
  if (await fs.pathExists(targetDir)) {
    await fs.remove(targetDir);
    return { success: true };
  }
  return { success: false, error: "Not found" };
});

ipcMain.on("extensions:open-window", (event, { url, title }) => {
  let win = new BrowserWindow({
    width: 450,
    height: 650,
    title: title || "Extension",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadURL(url);
  win.on("closed", () => {
    win = null;
  });
});
