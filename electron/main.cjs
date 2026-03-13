const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let backendProcess = null;
let mainWindow = null;
let splashWindow;

const platform = process.platform;
const archFolder =
  platform === "win32"
    ? "windows"
    : platform === "darwin"
      ? "universal-darwin"
      : "x86_64-linux";
const binaryName = platform === "win32" ? "pdflatex.exe" : "pdflatex";

function startBackend() {
  const isDev = !app.isPackaged;
  const userDataPath = app.getPath("userData");

  if (isDev) {
    const latexBinPath = path.join(
      process.cwd(),
      "resources",
      "TinyTex",
      platform === "win32" ? "win" : platform === "darwin" ? "mac" : "linux",
      "bin",
      archFolder,
    );
    backendProcess = spawn("npm", ["start"], {
      shell: true,
      cwd: __dirname.replace("/electron", ""),
      stdio: "inherit",
      env: {
        ...process.env,
        USER_DATA_PATH: userDataPath,
        PATH: `${latexBinPath}${path.delimiter}${process.env.PATH}`,
      },
    });
  } else {
    const backendPath = path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "server.js",
    );

    const latexBinPath = path.join(
      userDataPath,
      "resources",
      "TinyTex",
      platform === "win32" ? "win" : platform === "darwin" ? "mac" : "linux",
      "bin",
      archFolder,
    );

    backendProcess = spawn("node", [backendPath], {
      cwd: userDataPath,
      stdio: "inherit",
      env: {
        ...process.env,
        USER_DATA_PATH: userDataPath,
        PATH: `${latexBinPath}${path.delimiter}${process.env.PATH}`,
        RESOURCES_PATH: userDataPath,
      },
    });
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

// app.whenReady().then(async () => {
//   const fs = require("fs-extra");
//   const userDataPath = app.getPath("userData");

//   const pdflatexPath = path.join(
//     userDataPath,
//     "resources",
//     "TinyTex",
//     platform === "win32" ? "win" : platform === "darwin" ? "mac" : "linux",
//     "bin",
//     archFolder,
//     binaryName,
//   );

//   const isFirstRun = !require("fs").existsSync(pdflatexPath);

//   // The code/server.js is in app.asar.unpacked
//   const unpackedPath = path.join(process.resourcesPath, "app.asar.unpacked");
//   // TinyTex is directly in resources
//   const resourcesPath = process.resourcesPath;

//   if (app.isPackaged) {
//     // Handle folders from extraResources (Directly in resources)
//     //The below code was removed since we changed the plan of bundling TinyTex with the application

//     // const extraFolders = ["TinyTex"];
//     // for (const folder of extraFolders) {
//     //   const dest = path.join(userDataPath, folder);
//     //   const src = path.join(resourcesPath, folder);
//     //   if (!fs.existsSync(dest) && fs.existsSync(src)) {
//     //     await fs.copy(src, dest);
//     //   }
//     // }

//     // Handle folders from asarUnpack (Inside app.asar.unpacked)
//     const asarFolders = ["projects", "templates", "settings"];
//     for (const folder of asarFolders) {
//       const dest = path.join(userDataPath, folder);
//       const src = path.join(unpackedPath, folder);
//       if (!fs.existsSync(dest) && fs.existsSync(src)) {
//         await fs.copy(src, dest);
//       }
//     }

//     //FIXME: Add Splash Screen
//     // createSplashWindow(isFirstRun);

//     //Setup TinyTex in the background
//     await setupTinyTex(userDataPath);
//   }

//   startBackend();
//   setTimeout(createWindow, 2000);
// });

function createSplashWindow(isFirstRun) {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
    },
  });

  // Pass the flag to the HTML file
  const splashPath = path.join(__dirname, "../public/splash.html");
  splashWindow.loadURL(`file://${splashPath}?firstRun=${isFirstRun}`);
}

app.whenReady().then(async () => {
  const fs = require("fs-extra");
  const userDataPath = app.getPath("userData");
  const isDev = !app.isPackaged;

  const pdflatexPath = path.join(
    userDataPath,
    "resources",
    "TinyTex",
    platform === "win32" ? "win" : platform === "darwin" ? "mac" : "linux",
    "bin",
    archFolder,
    binaryName,
  );

  const isFirstRun = !require("fs").existsSync(pdflatexPath);

  // 1. ALWAYS ensure essential folders exist in userDataPath (Dev & Prod)
  const unpackedPath = isDev
    ? process.cwd()
    : path.join(process.resourcesPath, "app.asar.unpacked");
  const asarFolders = ["projects", "templates", "settings"];

  createSplashWindow(isFirstRun);

  for (const folder of asarFolders) {
    const dest = path.join(userDataPath, folder);
    const src = path.join(unpackedPath, folder);
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      await fs.copy(src, dest);
    }
  }

  // 2. ONLY run the heavy LaTeX setup if packaged (or if you want to test it in Dev)
  if (!isDev) {
    await setupTinyTex(userDataPath);
  }
  startBackend();
  createWindow();

  mainWindow.once("ready-to-show", () => {
    splashWindow.close();
    mainWindow.show();
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
