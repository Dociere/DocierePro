import { spawn } from "child_process";
import fs from "fs-extra";
import { getTinyTexBinPath } from "./setup-tinytex.js";

/**
 * Installs additional LaTeX packages in the background.
 * @param {string} userDataPath - Application user data path
 * @param {boolean} isDev - Whether the app is in development mode
 * @param {function} onProgress - Progress callback
 */
export async function setupExtraPackages(
  userDataPath,
  isDev,
  onProgress = () => {},
) {
  const tlmgrPath = getTinyTexBinPath(userDataPath, isDev, "tlmgr");

  if (!fs.existsSync(tlmgrPath)) {
    console.error(`tlmgr not found at: ${tlmgrPath}`);
    return;
  }

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

  const essentials = [
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
    "cm-super",
    "ragged2e",
  ];

  try {
    console.log("Checking for missing LaTeX packages in binary...");
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
      // Install in segments to avoid command line length limits or just to show more granular progress
      for (const pkg of missingPackages) {
        onProgress(`Installing ${pkg}...`);
        await runCommand(tlmgrPath, ["install", pkg]);
      }
    } else {
      console.log("All essential packages are already present.");
    }
  } catch (error) {
    console.error("Error during background package check/install:", error);
  }

  console.log("✅ Background LaTeX setup complete!");
  onProgress("LaTeX Setup Complete!");
}
