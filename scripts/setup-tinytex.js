import { execSync } from "child_process";
import { fileURLToPath } from "url";
import axios from "axios";
import fs from "fs-extra";
import path from "path";
import * as tar from "tar";
import admZip from "adm-zip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupTinyTex(userDataPath) {
  const isDev = !process.env.userDataPath;
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

    const response = await axios({ url, responseType: "stream" });
    const tempFile = path.join(__dirname, `tinytex_temp${path.extname(url)}`);
    const writer = fs.createWriteStream(tempFile);
    response.data.pipe(writer);

    await new Promise((resolve) => writer.on("finish", resolve));

    fs.ensureDirSync(destDir);
    console.log("Extracting...");
    if (platform === "win32") {
      const zip = new admZip(tempFile);
      zip.extractAllTo(destDir, true);
    } else {
      await tar.x({ file: tempFile, cwd: destDir, strip: 1 });
      const binDir = path.join(destDir, "bin", archFolder);
      execSync(`chmod -R +x "${binDir}"`);
    }
    fs.removeSync(tempFile);
  }

  const tlmgrPath = path.join(
    destDir,
    "bin",
    archFolder,
    platform === "win32" ? "tlmgr.bat" : "tlmgr",
  );

  const essentials = [
    "latex-bin",
    "amsmath",
    "geometry",
    "xcolor",
    "graphics",
    "tools",
    "amssymb",
    "etoolbox",
    "hyperref",
    "microtype",
    "fancyhdr",
    "enumitem",
    "setspace",
    "titlesec",
    "tikz",
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
    "bm",
    "physics",
    "mhchem",
    "babel",
    "fontspec",
    "lmodern",
    "tabularx",
    "multirow",
    "array",
    "tocloft",
    "multicol",
    "pdflscape",
    "pgfplots",
    "pdfpages",
    "fancyvrb",
    "csquotes",
    "latexmk",
  ];

  try {
    console.log("Checking for tlmgr updates...");
    execSync(`"${tlmgrPath}" update --self`);
  } catch (error) {
    console.log("tlmgr is already up to date or update skipped.");
  }

  try {
    console.log("Installing essential LaTeX packages...");
    execSync(`"${tlmgrPath}" install ${essentials.join(" ")}`);
  } catch (error) {
    console.log("There was an error when installing LaTeX packages");
  }
  console.log("✅ TinyTex Setup Complete!");
}

setupTinyTex().catch(console.error);
