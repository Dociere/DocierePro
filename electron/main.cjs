const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let backendProcess = null;
let mainWindow = null;

function startBackend() {
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    // In development, run your backend with nodemon
    backendProcess = spawn("npm", ["start"], {
      shell: true,
      cwd: __dirname.replace("/electron", ""), // Root directory
      stdio: "inherit",
    });
  } else {
    // In production, run your backend directly
    backendProcess = spawn("node", ["server.js"], {
      cwd: process.resourcesPath || path.join(__dirname, ".."),
      stdio: "inherit",
    });
  }

  backendProcess.on("error", (err) => {
    console.error("Failed to start backend:", err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "../public/dociereLogo1.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.setMenu(null);
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
