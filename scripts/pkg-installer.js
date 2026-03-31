import { spawn } from "child_process";
import fs from "fs-extra";
// import path from "path";
import { fileURLToPath } from "url";
// import { dirname } from "path";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

import { getTinyTexBinPath } from "./setup-tinytex.js";

// Helper to determine tlmgr path
export const getTlmgrPath = () => {
  // For standalone/dev use, we assume isDev=true and no userDataPath
  return getTinyTexBinPath(
    process.env.USER_DATA_PATH,
    !process.env.USER_DATA_PATH,
    "tlmgr",
  );
};

const getPackageNameFromFile = (tlmgr, fileName) => {
  return new Promise((resolve) => {
    // Search for the package that contains the specific file
    const searchPattern = fileName.includes(".")
      ? `/${fileName}`
      : `/${fileName}.sty`;

    const proc = spawn(tlmgr, ["search", "--global", "--file", searchPattern], {
      shell: process.platform === "win32",
    });

    let output = "";
    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.on("close", () => {
      const lines = output.split(/[\r\n]+/);
      const pkgLine = lines.find((line) => line.trim().endsWith(":"));
      if (pkgLine) {
        resolve(pkgLine.trim().replace(":", ""));
      } else {
        // Fallback: remove common extensions if search fails
        resolve(fileName.replace(/\.(sty|cls|def|fmt)$/, ""));
      }
    });
  });
};

const runTlmgrCommand = (tlmgr, args, onProgress = () => {}) => {
  return new Promise((resolve, reject) => {
    const proc = spawn(tlmgr, args, { shell: process.platform === "win32" });
    proc.stdout.on("data", (data) => {
      const txt = data.toString();
      const match =
        txt.match(/install:\s+([a-zA-Z0-9_-]+)/i) ||
        txt.match(/installing\s+([a-zA-Z0-9_-]+)/i);
      if (match) {
        onProgress(`Installing ${match[1]}...`);
      }
    });
    proc.stderr.on("data", (data) =>
      console.error(`[tlmgr stderr]: ${data.toString()}`),
    );
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tlmgr failed with code ${code}`));
    });
  });
};

/**
 * Detects missing LaTeX packages from log text and installs them.
 * @param {string} logText - The LaTeX log content
 * @param {string} tlmgr - Path to tlmgr binary (optional)
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string[]>} - List of installed packages
 */
export async function installMissingPackages(
  logText,
  tlmgr = null,
  onProgress = (m) => console.log(m),
) {
  const packageRegex =
    /! LaTeX Error: File [`']?([^' ]+)[`']? not found|you do not have the ([^' ]+) package installed/gi;
  const matches = [...logText.matchAll(packageRegex)];
  const fileSet = new Set();

  for (const match of matches) {
    const fileName = match[1] || match[2];
    if (fileName) fileSet.add(fileName);
  }

  if (fileSet.size === 0) return [];

  const tlmgrPath = tlmgr || getTlmgrPath();
  if (!fs.existsSync(tlmgrPath)) {
    throw new Error(`tlmgr not found at: ${tlmgrPath}`);
  }

  onProgress(`Resolving ${fileSet.size} dependencies...`);
  const actualPackages = await Promise.all(
    [...fileSet].map((file) => getPackageNameFromFile(tlmgrPath, file)),
  );

  const uniquePkgs = [...new Set(actualPackages)];
  if (uniquePkgs.length > 0) {
    onProgress(`Installing packages: ${uniquePkgs.join(", ")}`);
    await runTlmgrCommand(tlmgrPath, ["install", ...uniquePkgs], onProgress);
  }

  return uniquePkgs;
}

// Standalone execution for testing
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const logFile = process.argv[2] || "scripts/test.log";
  if (fs.existsSync(logFile)) {
    const text = fs.readFileSync(logFile, "utf8");
    installMissingPackages(text)
      .then((pkgs) =>
        console.log(`Finished installation: ${pkgs.join(", ") || "None"}`),
      )
      .catch((err) => console.error("Error:", err));
  } else {
    console.error(`Log file not found: ${logFile}`);
  }
}
