import { execSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import axios from "axios";
import fs from "fs-extra";
import path from "path";
import * as tar from "tar";
import admZip from "adm-zip";
// const { app } = require("electron");
import app from "electron";

export async function setupTinyTex(
  userDataPath,
  isDevMode,
  onProgress = () => {},
) {
  const isDev = isDevMode;
  const platform = process.platform;
  const baseDir = isDev ? process.cwd() : userDataPath;
  const destDir = path.join(
    baseDir,
    "resources",
    "TinyTex",
    platform === "win32" ? "win" : platform === "darwin" ? "mac" : "linux",
  );

  const binaryName = platform === "win32" ? "pdflatex.exe" : "pdflatex";

  const archFolder =
    platform === "win32"
      ? "windows"
      : platform === "darwin"
        ? "universal-darwin"
        : "x86_64-linux";

  const pdflatexPath = path.join(destDir, "bin", archFolder, binaryName);

  console.log("userDataPath from setup-latex.js", userDataPath);
  console.log("process.cwd() from setup-latex.js", process.cwd());
  console.log("pdflatexPath from setup-latex.js", pdflatexPath);
  console.log(
    "pdflatexPath status from setup-latex.js",
    fs.existsSync(pdflatexPath),
  );
  console.log("isDev from setup-latex.js", isDev);

  const tlmgrPath = path.join(
    destDir,
    "bin",
    archFolder,
    platform === "win32" ? "tlmgr.bat" : "tlmgr",
  );

  const runCommandAndGetOutput = (cmd, args) => {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args);
      let output = "";
      proc.stdout.on("data", (data) => (output += data.toString()));
      proc.on("close", (code) => {
        if (code === 0) resolve(output);
        else reject(new Error(`Exit code ${code}`));
      });
    });
  };

  const runCommand = (cmd, args) => {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args);
      proc.stdout.on("data", (data) => {
        const txt = data.toString();
        const match =
          txt.match(/install:\s+([a-zA-Z0-9_-]+)/i) ||
          txt.match(/installing\s+([a-zA-Z0-9_-]+)/i);
        if (match) {
          onProgress(`Installing ${match[1]}...`);
        }
      });
      proc.stderr.on("data", (data) => console.error(data.toString()));
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Command failed with exit code ${code}`));
      });
    });
  };

  if (!fs.existsSync(pdflatexPath)) {
    // Install TinyTex-0
    const urls = {
      win32:
        "https://github.com/rstudio/tinytex-releases/releases/download/v2026.03.02/TinyTeX-0-v2026.03.02.zip",
      darwin:
        "https://github.com/rstudio/tinytex-releases/releases/download/v2026.03.02/TinyTeX-0-v2026.03.02.tgz",
      linux:
        "https://github.com/rstudio/tinytex-releases/releases/download/v2026.03.02/TinyTeX-0-v2026.03.02.tar.gz",
    };

    const url = urls[platform];
    console.log(`Downloading TinyTeX-0 for ${platform}...`);
    onProgress(`Downloading TinyTeX-0...`);

    const response = await axios({ url, responseType: "stream" });
    const tempFile = path.join(baseDir, `tinytex_temp${path.extname(url)}`);
    // const tempFile = path.join(
    //   userDataPath,
    //   `tinytex_temp${path.extname(url)}`,
    // );
    const writer = fs.createWriteStream(tempFile);
    response.data.pipe(writer);

    await new Promise((resolve) => writer.on("finish", resolve));

    fs.ensureDirSync(destDir);
    console.log("Extracting...");
    onProgress("Extracting TinyTeX...");
    if (platform === "win32") {
      const zip = new admZip(tempFile);
      zip.extractAllTo(destDir, true);
    } else {
      await tar.x({ file: tempFile, cwd: destDir, strip: 1 });
      const binDir = path.join(destDir, "bin", archFolder);
      execSync(`chmod -R +x "${binDir}"`);
    }
    fs.removeSync(tempFile);

    try {
      console.log("Checking for tlmgr updates...");
      onProgress("Checking for updates...");
      await runCommand(tlmgrPath, ["update", "--self"]);
    } catch (error) {
      console.log("tlmgr is already up to date or update skipped.");
    }
  }

  const essentials = [
    "latex-bin",
    "amsmath",
    "geometry",
    "xcolor",
    "graphics",
    "tools",
    "etoolbox",
    "hyperref",
    "microtype",
    "fancyhdr",
    "enumitem",
    "setspace",
    "titlesec",
    "pgf",
    "float",
    "caption",
    "booktabs",
    "listings",
    "tcolorbox",
    "cleveref",
    "biblatex",
    "graphics-def",
    "amsfonts",
    "natbib",
    "url",
    "xstring",
    "logreq",
    "biber",
    "parskip",
    "mathtools",
    "physics",
    "mhchem",
    "babel",
    "fontspec",
    "lm",
    "multirow",
    "tocloft",
    "pdflscape",
    "pgfplots",
    "pdfpages",
    "fancyvrb",
    "csquotes",
    "latexmk",
    "algorithms",
    "cite",
  ];

  // try {
  //   console.log("Checking for tlmgr updates...");
  //   onProgress("Checking for updates...");
  //   await runCommand(tlmgrPath, ["update", "--self"]);
  // } catch (error) {
  //   console.log("tlmgr is already up to date or update skipped.");
  // }

  try {
    console.log("Checking for missing LaTeX packages...");
    onProgress("Checking installed packages...");

    const installedOutput = await runCommandAndGetOutput(tlmgrPath, [
      "list",
      "--only-installed",
      "--data",
      "name",
    ]);
    const installedSet = new Set(
      installedOutput.split(/\r?\n/).map((s) => s.trim()),
    );

    const missingPackages = essentials.filter((pkg) => !installedSet.has(pkg));

    if (missingPackages.length > 0) {
      console.log(`Installing ${missingPackages.length} missing packages...`);
      onProgress(`Installing ${missingPackages.length} packages...`);
      await runCommand(tlmgrPath, ["install", ...missingPackages]);
    } else {
      console.log("All essential packages are already present.");
    }
  } catch (error) {
    console.log("Error during package check/install", error);
  }

  // try {
  //   console.log("Installing essential LaTeX packages...");
  //   onProgress("Preparing to install packages...");
  //   await runCommand(tlmgrPath, ["install", ...essentials]);
  // } catch (error) {
  //   console.log("There was an error when installing LaTeX packages", error);
  // }
  console.log("✅ TinyTex Setup Complete!");
  onProgress("✅ Setup Complete!");
}
