import express from "express";
import cors from "cors";
import fs from "fs-extra";
import path from "path";
import { exec, spawn } from "child_process";
import { createInterface } from "readline";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import AdmZip from "adm-zip";
import { PDFParse as pdfParse } from "pdf-parse";
import axios from "axios";
import dotenv, { config } from "dotenv";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import * as TemplateEngine from "./renderStrategies.js";
import util from "util";
import crypto from "crypto";
import { installMissingPackages } from "./scripts/pkg-installer.js";
import { getTinyTexBinPath } from "./scripts/setup-tinytex.js";
dotenv.config();

//DEV Mode means using local pdflatex while PROD Mode means TinyTex
// const projMode = "DEV";
const projMode = "PROD";

// const envEncryptionKey = process.env.ENCRYPTION_KEY;
// const ENCRYPTION_KEY = Buffer.from(envEncryptionKey, "utf8");
const ENCRYPTION_KEY = process.env.envEncryptionKey;
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text) {
  if (!text || !text.includes(":")) return text;
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift(), "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

const execAsync = util.promisify(exec);
const app = express();
const PORT = 50450;

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = !process.env.USER_DATA_PATH;
const baseDir = isDev ? __dirname : process.env.USER_DATA_PATH;

// const SIDECAR_PATH = isDev
//   ? join(__dirname, "sidecar", "build", "sidecar")
//   : join(process.env.RESOURCES_PATH, "sidecar");

const getServerUrl = () => {
  const configPath = path.join(SETTINGS_DIR, "config.json");

  const defaultConfig = {
    server: {
      mode: "selfHosting",
      methods: {
        selfHosting: {
          backendServer: "",
          webSocketServer: "",
        },
        cloudHosting: {
          backendServer: "https://server.dociere.com",
          webSocketServer: "wss://ws.dociere.com",
        },
      },
    },
  };

  try {
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(
        configPath,
        JSON.stringify(defaultConfig, null, 2),
        "utf-8",
      );
    }

    const rawData = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(rawData);

    const mode = config?.server?.mode || "selfHosting";
    let serverUrl = config?.server?.methods[mode]?.backendServer;

    if (!serverUrl) {
      serverUrl = defaultConfig.server.methods[mode].backendServer;
    }

    // Ensure protocol is present
    if (
      serverUrl &&
      !serverUrl.startsWith("http://") &&
      !serverUrl.startsWith("https://")
    ) {
      // Default to https for cloud, http for localhost
      if (serverUrl.includes("localhost") || serverUrl.includes("127.0.0.1")) {
        serverUrl = `http://${serverUrl}`;
      } else {
        serverUrl = `https://${serverUrl}`;
      }
    }

    // Remove trailing slash
    return serverUrl ? serverUrl.replace(/\/$/, "") : "http://localhost:5025";
  } catch (error) {
    console.error("❌ Error reading server config:", error);
    return "http://localhost:5025";
  }
};

async function getActiveAIConfig() {
  try {
    const settingsDir = path.join(SETTINGS_DIR, "config.json");
    console.log(`🔍 Checking for config at: ${settingsDir}`);
    if (await fs.pathExists(settingsDir)) {
      const settings = await fs.readJSON(settingsDir);
      if (settings.app && settings.app.aiConfigs) {
        const active = settings.app.aiConfigs.find((c) => c.active);
        if (active) {
          console.log(
            `✅ Found active AI config: ${active.name} (${active.provider})`,
          );
          const config = { ...active };
          if (config.provider === "gemini" && config.apiKey) {
            console.log(`🔐 Decrypting API key for ${active.name}`);
            config.apiKey = decrypt(config.apiKey);
          }
          return config;
        } else {
          console.log(
            "⚠️ No active AI configuration found in settings.app.aiConfigs",
          );
        }
      } else {
        console.log("⚠️ settings.app.aiConfigs is missing");
      }
    } else {
      console.log("⚠️ config.json not found");
    }
  } catch (error) {
    console.error("❌ Error loading active AI config:", error);
  }
  return null;
}

console.log("isDev, baseDir", isDev, baseDir);

const SETTINGS_DIR = isDev ? __dirname : join(baseDir, "settings");
const PROJECTS_DIR = join(baseDir, "projects");
const TEMP_DIR = join(baseDir, "projects/temp");
const OUTPUT_DIR = join(baseDir, "projects/output");
const EQUATIONS_DIR = join(baseDir, "projects/equations");
const CITATIONS_DIR = join(baseDir, "projects/citations");
const TEMPLATES_DIR = join(baseDir, "templates");
const USER_TEMPLATES_DIR = join(baseDir, "user-templates");
const jobDir = TEMP_DIR;

//Create all Directories
[
  SETTINGS_DIR,
  PROJECTS_DIR,
  TEMP_DIR,
  OUTPUT_DIR,
  EQUATIONS_DIR,
  CITATIONS_DIR,
  TEMPLATES_DIR,
  USER_TEMPLATES_DIR,
].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize directories
async function initDirectories() {
  await fs.ensureDir(PROJECTS_DIR);
  await fs.ensureDir(TEMP_DIR);
  await fs.ensureDir(OUTPUT_DIR);
  await fs.ensureDir(EQUATIONS_DIR);
  await fs.ensureDir(CITATIONS_DIR);
  await fs.ensureDir(SETTINGS_DIR);
  console.log("✅ Directories initialized");
}

// AI_SERVICE_URL is now dynamic via getServerUrl()

//Uncomment it when the data flow for sidecar is ready
// function extractPreamble(texContent) {
//   const match = texContent.match(/^([\s\S]*?)\\begin\{document\}/);
//   return match ? match[1].trim() : "";
// }

// function splitIntoChunks(texContent, files) {
//   const preamble = extractPreamble(texContent);

//   // Case 1: multi-file — use \input{} boundaries
//   const inputMatches = [...texContent.matchAll(/\\input\{([^}]+)\}/g)];
//   if (inputMatches.length >= 2) {
//     return {
//       preamble,
//       chunks: inputMatches.map((m) => {
//         const relPath = m[1].endsWith(".tex") ? m[1] : m[1] + ".tex";
//         return files[relPath]?.content ?? `% missing: ${relPath}`;
//       }),
//     };
//   }

//   // Case 2: single-file — split by \chapter or \section
//   const body = texContent
//     .replace(/^[\s\S]*?\\begin\{document\}/, "")
//     .replace(/\\end\{document\}[\s\S]*$/, "");
//   const parts = body.split(/(?=\\chapter\{|\\section\{)/);
//   const meaningful = parts.filter((p) => p.trim().length > 50); // skip tiny fragments

//   return { preamble, chunks: meaningful.length > 1 ? meaningful : [body] };
// }

// async function compileParallel(
//   texContent,
//   files,
//   jobDir,
//   outputPdfPath,
//   progressCallback,
// ) {
//   const { preamble, chunks } = splitIntoChunks(texContent, files);

//   // If only one chunk after splitting, no benefit — fall back to serial
//   if (chunks.length <= 1) return null;

//   const config = {
//     job_dir: jobDir,
//     preamble,
//     chunks,
//     output_pdf: outputPdfPath,
//   };

//   return new Promise((resolve, reject) => {
//     const sidecar = spawn(SIDECAR_PATH, [], {
//       stdio: ["pipe", "pipe", "pipe"],
//     });

//     // Send job config to sidecar via stdin
//     sidecar.stdin.write(JSON.stringify(config));
//     sidecar.stdin.end();

//     // ─── What you learn: readline for line-delimited JSON ────────────────
//     // stdout is a byte stream. readline splits it on \n for us.
//     // Each line is one JSON progress event from the sidecar.
//     const rl = createInterface({ input: sidecar.stdout });
//     rl.on("line", (line) => {
//       try {
//         const event = JSON.parse(line);
//         progressCallback(event); // forward to SSE stream
//         if (event.event === "complete") resolve(event.output);
//       } catch (e) {
//         /* malformed line, ignore */
//       }
//     });

//     sidecar.stderr.on("data", (d) => console.error("sidecar:", d.toString()));
//     sidecar.on("error", reject);
//     sidecar.on("close", (code) => {
//       if (code !== 0) reject(new Error(`Sidecar exited with code ${code}`));
//     });
//   });
// }

const getPdflatexPath = () => {
  return getTinyTexBinPath(process.env.USER_DATA_PATH, isDev, "pdflatex");
};

const getTlmgrPath = () => {
  return getTinyTexBinPath(process.env.USER_DATA_PATH, isDev, "tlmgr");
};

//FIXME: Convert to C++
function runPdfLatexPermissive(texFilePath, outputPath, extraTexInputs = []) {
  return new Promise((resolve, reject) => {
    console.log(`🔧 Running pdflatex on: ${texFilePath}`);
    console.log(`🔧 Output directory: ${outputPath}`);

    const pdflatexPath = getPdflatexPath();

    const projectDir = path.dirname(texFilePath);

    // Build TEXINPUTS: working dir, any caller-supplied paths, then the system default
    const texInputPaths = [
      projectDir,
      path.join(projectDir, "sections"),
      ...extraTexInputs,
      process.env.TEXINPUTS || "",
    ];

    const customTexInputs = texInputPaths.join(path.delimiter);

    const pdflatex = spawn(
      projMode === "DEV" ? "pdflatex" : pdflatexPath,
      [
        "-shell-escape",
        `-output-directory=${outputPath}`,
        "-interaction=nonstopmode", // Never stop for errors
        "-file-line-error",
        "-synctex=1", // Better error format
        texFilePath,
      ],
      {
        cwd: projectDir,
        env: {
          ...process.env,
          TEXINPUTS: customTexInputs,
        },
        stdio: ["ignore", "pipe", "pipe"], // Ignore stdin, capture stdout/stderr
      },
    );

    let stdout = "";
    let stderr = "";

    pdflatex.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pdflatex.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pdflatex.on("close", (code) => {
      console.log(`✅ pdflatex process exited with code: ${code}`);
      // ALWAYS resolve - never reject on error codes
      resolve({ stdout, stderr, code });
    });

    pdflatex.on("error", (error) => {
      console.error(`❌ Failed to spawn pdflatex:`, error);
      reject(error);
    });
  });
}

//FIXME: The below code makes NOOO sense
// Detect LaTeX on startup
let PDFLATEX_PATH;
try {
  PDFLATEX_PATH = "pdflatex";
  console.log("🎉 LaTeX detected successfully!");
} catch (error) {
  console.error(error.message);
  PDFLATEX_PATH = null;
}

// Utility: Clean up temporary files
const cleanupFiles = async (baseFilename, directory) => {
  const extensions = [
    "tex",
    "aux",
    "log",
    "fls",
    "fdb_latexmk",
    "synctex.gz",
    "out",
  ];
  for (const ext of extensions) {
    try {
      await fs.remove(path.join(directory, `${baseFilename}.${ext}`));
    } catch (error) {
      console.log("Error related to Temp File Cleanup", error);
    }
  }
};

// Utility: Convert PDF to image
async function convertPdfToImage(pdfPath, outputPath) {
  return new Promise((resolve, reject) => {
    const pdftoppm = spawn("pdftoppm", [
      "-png",
      "-singlefile",
      "-r",
      "300",
      pdfPath,
      outputPath.replace(".png", ""),
    ]);

    let stderr = "";
    pdftoppm.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pdftoppm.on("close", (code) => {
      if (code === 0) {
        resolve(`${outputPath.replace(".png", "")}.png`);
      } else {
        reject(new Error(`pdftoppm failed: ${stderr}`));
      }
    });

    pdftoppm.on("error", (error) => {
      reject(new Error(`Failed to start pdftoppm: ${error.message}`));
    });
  });
}

// Utility: Auto-crop image to content
async function cropImageToContent(imagePath, outputPath) {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const { width, height, channels } = metadata;
    const buffer = await image.raw().toBuffer();
    const bounds = await findContentBounds(buffer, width, height, channels);

    // If the image is completely blank, return it without cropping to avoid crash
    if (bounds.left >= bounds.right || bounds.top >= bounds.bottom) {
      await sharp(imagePath).toFile(outputPath);
      return outputPath;
    }

    const padding = 20;
    const cropOptions = {
      left: Math.max(0, bounds.left - padding),
      top: Math.max(0, bounds.top - padding),
      width: Math.min(width, bounds.right - bounds.left + 2 * padding),
      height: Math.min(height, bounds.bottom - bounds.top + 2 * padding),
    };

    await image.extract(cropOptions).png({ quality: 100 }).toFile(outputPath);
    return outputPath;
  } catch (error) {
    console.error("Crop error:", error);
    await sharp(imagePath).toFile(outputPath);
    return outputPath;
  }
}

async function findContentBounds(buffer, width, height, channels = 3) {
  let minX = width,
    maxX = 0,
    minY = height,
    maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * channels;
      let r,
        g,
        b,
        a = 255;

      // Dynamically handle different color channel layouts
      if (channels >= 3) {
        r = buffer[index];
        g = buffer[index + 1];
        b = buffer[index + 2];
        if (channels === 4) a = buffer[index + 3];
      } else {
        r = buffer[index];
        g = buffer[index];
        b = buffer[index];
        if (channels === 2) a = buffer[index + 1];
      }

      // Check if pixel is not white and not fully transparent
      if (a > 10 && (r < 250 || g < 250 || b < 250)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return {
    left: minX === width ? 0 : minX,
    right: maxX === 0 ? width : maxX,
    top: minY === height ? 0 : minY,
    bottom: maxY === 0 ? height : maxY,
  };
}

// Citation format generators
// FIXME: Separate the docs into different file for modularity
function generateIEEECitation({
  authors,
  title,
  journal,
  volume,
  issue,
  pages,
  year,
  doi,
}) {
  let citation = authors;
  citation += `, "${title}," `;
  if (journal) citation += `\\textit{${journal}}`;
  if (volume) citation += `, ${volume}`;
  if (issue) citation += `, no. ${issue}`;
  if (pages) citation += `, pp. ${pages}`;
  citation += `, ${year}.`;
  if (doi) citation += ` DOI: ${doi}.`;
  return citation;
}

function generateAPACitation({
  authors,
  title,
  journal,
  volume,
  issue,
  pages,
  year,
  doi,
}) {
  const authorList = authors.split(",")[0].trim() + " et al.";
  let citation = `${authorList} (${year}). ${title}. `;
  if (journal) citation += `\\textit{${journal}}`;
  if (volume) citation += `, \\textit{${volume}}`;
  if (issue) citation += `(${issue})`;
  if (pages) citation += `, ${pages}`;
  citation += `.`;
  if (doi) citation += ` https://doi.org/${doi}`;
  return citation;
}

function generateMLACitation({
  authors,
  title,
  journal,
  volume,
  issue,
  pages,
  year,
}) {
  let citation = authors.split(",")[0].trim() + ", et al. ";
  citation += `"${title}." `;
  if (journal) citation += `\\textit{${journal}}`;
  if (volume) citation += `, vol. ${volume}`;
  if (issue) citation += `, no. ${issue}`;
  citation += `, ${year}`;
  if (pages) citation += `, pp. ${pages}`;
  citation += `.`;
  return citation;
}

function generateChicagoCitation({
  authors,
  title,
  journal,
  volume,
  issue,
  pages,
  year,
  doi,
}) {
  let citation = authors.split(",")[0].trim() + ", et al. ";
  citation += `"${title}." `;
  if (journal) citation += `\\textit{${journal}}`;
  if (volume) citation += ` ${volume}`;
  if (issue) citation += `, no. ${issue}`;
  citation += ` (${year})`;
  if (pages) citation += `: ${pages}`;
  citation += `.`;
  if (doi) citation += ` https://doi.org/${doi}.`;
  return citation;
}

function generateHarvardCitation({
  authors,
  title,
  journal,
  volume,
  issue,
  pages,
  year,
  doi,
}) {
  const firstAuthor = authors.split(",")[0].trim();
  let citation = `${firstAuthor} et al. (${year}) `;
  citation += `'${title}', `;
  if (journal) citation += `\\textit{${journal}}`;
  if (volume) citation += `, ${volume}`;
  if (issue) citation += `(${issue})`;
  if (pages) citation += `, pp. ${pages}`;
  citation += `.`;
  if (doi) citation += ` doi: ${doi}`;
  return citation;
}

// ==================== SYNCTEX ====================\

app.post("/api/synctex", async (req, res) => {
  try {
    const { pdfFile, page, x, y } = req.body;

    // 1. Clean the filename (remove query strings like ?t=123)
    const cleanFileName = pdfFile.split("?")[0];
    const baseName = path.parse(cleanFileName).name;

    const synctexFile = path.join(OUTPUT_DIR, `${baseName}.synctex.gz`);
    const absPdfPath = path.join(OUTPUT_DIR, cleanFileName);

    console.log(`🔎 Looking for SyncTeX file at: ${synctexFile}`);

    if (!(await fs.pathExists(synctexFile))) {
      return res.status(404).json({
        error: "SyncTeX file missing. Please recompile.",
        pathAttempted: synctexFile,
      });
    }

    // 2. Execute search
    const cmd = `synctex edit -o "${page}:${x}:${y}:${absPdfPath}"`;
    const { stdout } = await execAsync(cmd);

    const lineMatch = stdout.match(/Line:(\d+)/);
    if (lineMatch) {
      res.json({ success: true, line: parseInt(lineMatch[1], 10) });
    } else {
      res.json({ success: false, error: "No match found in PDF mapping." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ==================== PAPER EDITING USING AI ROUTE ====================
// API: AI Edit LaTeX
app.post("/api/edit", async (req, res) => {
  try {
    const {
      prompt,
      latexContent,
      context,
      fileMap,
      aiConfig: frontendConfig,
    } = req.body;

    if (!prompt || !latexContent) {
      return res
        .status(400)
        .json({ error: "Prompt and LaTeX content required" });
    }

    console.log(
      `🤖 Editing LaTeX with AI prompt: "${prompt.substring(0, 50)}..."`,
    );

    const aiConfig = frontendConfig || (await getActiveAIConfig());
    const currentAiUrl = getServerUrl();
    console.log(
      `📤 Sending to AI Service (${currentAiUrl}/api/edit-latex) with provider: ${
        aiConfig?.provider || "default"
      }`,
    );

    const aiResponse = await axios.post(
      `${currentAiUrl}/api/edit-latex`,
      {
        prompt,
        latexContent,
        context,
        fileMap,
        aiConfig, // Pass active config
      },
      {
        headers: { Cookie: req.headers.cookie || "" }, // <-- Added this!
      },
    );

    if (aiResponse.data.success) {
      res.json({
        success: true,
        latexContent: aiResponse.data.latexContent,
        changedSnippet: aiResponse.data.changedSnippet,
        aiMessage: aiResponse.data.message,
        fileUpdates: aiResponse.data.fileUpdates || {},
      });
    } else {
      throw new Error(aiResponse.data.error || "AI edit failed");
    }
  } catch (error) {
    console.error("❌ AI Edit Error:", error.message);
    res.status(500).json({ success: false, error: "Failed to edit document" });
  }
});

// ==================== PAPER REVIEW USING AI ROUTE ====================
app.post("/api/review", async (req, res) => {
  try {
    const { latexContent, aiConfig: frontendConfig, reviewOptions } = req.body;

    if (!latexContent) {
      return res.status(400).json({ error: "LaTeX content required" });
    }

    const aiConfig = frontendConfig || (await getActiveAIConfig());
    const currentAiUrl = getServerUrl();
    
    const aiResponse = await axios.post(
      `${currentAiUrl}/api/review`,
      { latexContent, aiConfig, reviewOptions },
      { headers: { Cookie: req.headers.cookie || "" } }
    );

    if (aiResponse.data.success) {
      res.json(aiResponse.data);
    } else {
      throw new Error(aiResponse.data.error || "AI review failed");
    }
  } catch (error) {
    console.error("❌ AI Review Error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch AI review" });
  }
});

// ==================== EQUATION GENERATION USING AI ROUTE ====================

app.post("/api/generate-equation", async (req, res) => {
  try {
    const { prompt, aiConfig: frontendConfig } = req.body;

    if (!prompt) {
      return res
        .status(400)
        .json({ success: false, error: "Prompt is required" });
    }

    console.log(`🤖 Generating equation for prompt: "${prompt}"`);

    // Call Python AI Service
    const aiConfig = frontendConfig || (await getActiveAIConfig());
    const currentAiUrl = getServerUrl();
    console.log(
      `📤 Sending to AI Service (${currentAiUrl}/api/generate-equation)`,
    );
    const response = await axios.post(
      `${currentAiUrl}/api/generate-equation`,
      {
        prompt,
        aiConfig,
      },
      { timeout: 30000, headers: { Cookie: req.headers.cookie || "" } },
    );

    console.log("Response from /generate-equation", response);

    if (response.data && response.data.success) {
      console.log("✅ AI Equation generated successfully");
      res.json({
        success: true,
        latexEquation: response.data.latexEquation,
      });
    } else {
      throw new Error(response.data.error || "AI service failed");
    }
  } catch (error) {
    console.error("❌ AI Equation Generation Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate equation",
      details: error.message,
    });
  }
});

// ==================== PROJECT MANAGEMENT ROUTES ====================

// API: Health check
app.get("/api/health", (req, res) => {
  if (!PDFLATEX_PATH) {
    return res.json({
      status: "error",
      message: "pdfLaTeX not found. Please install MiKTeX or TeX Live",
      pdflatex: false,
    });
  }

  exec(`"${PDFLATEX_PATH}" --version`, (error, stdout) => {
    res.json({
      status: error ? "error" : "healthy",
      pdflatex: !error,
      version: stdout ? stdout.split("\n")[0] : "unknown",
      message: error ? error.message : "Server is healthy",
    });
  });
});

// Helper: recursively read all files from a template directory
async function getTemplateFiles(templatePath) {
  const files = {};

  async function scanDir(currentPath, relativePath = "") {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relPath = (
        relativePath ? path.join(relativePath, entry.name) : entry.name
      ).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        // Create a .gitkeep so the folder is tracked
        files[`${relPath}/.gitkeep`] = {
          name: ".gitkeep",
          content: "",
          type: "gitkeep",
        };
        await scanDir(fullPath, relPath);
      } else {
        if (entry.name === "preview.png") continue; // skip preview images

        const ext = path.extname(entry.name).toLowerCase();
        const textExts = [
          ".tex",
          ".bib",
          ".bst",
          ".sty",
          ".cls",
          ".txt",
          ".md",
          ".json",
        ];
        if (textExts.includes(ext)) {
          const content = await fs.readFile(fullPath, "utf-8");
          files[relPath] = {
            name: entry.name,
            content: content.replace(/\r\n/g, "\n"),
            type: ext.slice(1),
          };
        } else {
          // Binary — store as base64
          const buffer = await fs.readFile(fullPath);
          const mime =
            ext === ".png"
              ? "image/png"
              : ext === ".jpg" || ext === ".jpeg"
              ? "image/jpeg"
              : ext === ".pdf"
              ? "application/pdf"
              : "application/octet-stream";
          files[relPath] = {
            name: entry.name,
            content: `data:${mime};base64,${buffer.toString("base64")}`,
            type: ext.slice(1),
            isImage: true,
          };
        }
      }
    }
  }

  if (await fs.pathExists(templatePath)) {
    await scanDir(templatePath);
  }
  return files;
}

// API: List all local template folder names
app.get("/api/templates", async (req, res) => {
  try {
    const builtInEntries = await fs.readdir(TEMPLATES_DIR, {
      withFileTypes: true,
    });
    const builtInTemplates = builtInEntries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    let userTemplates = [];
    if (await fs.pathExists(USER_TEMPLATES_DIR)) {
      const userEntries = await fs.readdir(USER_TEMPLATES_DIR, {
        withFileTypes: true,
      });
      userTemplates = userEntries
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    }

    res.json({ success: true, builtInTemplates, userTemplates });
  } catch (error) {
    console.error("❌ Template list error:", error);
    res.status(500).json({ success: false, error: "Failed to list templates" });
  }
});

// API: Rename user template
app.put("/api/templates/rename", async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) {
      return res
        .status(400)
        .json({ success: false, error: "oldName and newName are required" });
    }

    const oldPath = path.join(USER_TEMPLATES_DIR, oldName);
    const newPath = path.join(USER_TEMPLATES_DIR, newName);

    if (!(await fs.pathExists(oldPath))) {
      return res
        .status(404)
        .json({ success: false, error: "Template not found" });
    }

    await fs.rename(oldPath, newPath);
    res.json({ success: true, message: "Template renamed successfully" });
  } catch (error) {
    console.error("❌ Template rename error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to rename template" });
  }
});

// API: Delete user template
app.delete("/api/templates/delete/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const templatePath = path.join(USER_TEMPLATES_DIR, name);

    if (!(await fs.pathExists(templatePath))) {
      return res
        .status(404)
        .json({ success: false, error: "Template not found" });
    }

    await fs.remove(templatePath);
    res.json({ success: true, message: "Template deleted successfully" });
  } catch (error) {
    console.error("❌ Template deletion error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete template" });
  }
});

// API: Save current project files as a local template
app.post("/api/templates/save", async (req, res) => {
  try {
    const { name, files } = req.body;

    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Template name is required" });
    }

    if (!files || Object.keys(files).length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No files to save" });
    }

    const templateDir = path.join(USER_TEMPLATES_DIR, name.trim());

    if (await fs.pathExists(templateDir)) {
      return res.status(409).json({
        success: false,
        error: "A template with this name already exists",
      });
    }

    await fs.ensureDir(templateDir);

    for (const [relPath, fileData] of Object.entries(files)) {
      // Skip .gitkeep placeholder files
      if (relPath.endsWith("/.gitkeep") || fileData.name === ".gitkeep") {
        const dirPath = path.dirname(path.join(templateDir, relPath));
        await fs.ensureDir(dirPath);
        continue;
      }

      const filePath = path.join(templateDir, relPath);
      await fs.ensureDir(path.dirname(filePath));

      if (
        fileData.isImage &&
        fileData.content &&
        fileData.content.startsWith("data:")
      ) {
        const base64Match = fileData.content.match(/^data:[^;]+;base64,(.+)$/);
        if (base64Match) {
          await fs.writeFile(filePath, Buffer.from(base64Match[1], "base64"));
        } else {
          await fs.writeFile(filePath, fileData.content, "utf8");
        }
      } else {
        await fs.writeFile(filePath, fileData.content || "", "utf8");
      }
    }

    console.log(`✅ Saved template: ${name.trim()}`);
    res.json({ success: true, message: "Template saved successfully" });
  } catch (error) {
    console.error("❌ Template save error:", error);
    res.status(500).json({ success: false, error: "Failed to save template" });
  }
});

// --- File text extraction for boilerplate generation ---
const boilerplateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".txt", ".md", ".zip"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, TXT, MD, and ZIP files are allowed"));
    }
  },
});

app.post(
  "/api/extract-file-text",
  boilerplateUpload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded" });
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      let extractedText = "";

      if (ext === ".pdf") {
        // Extract text from PDF — save buffer to temp file, then parse
        const tempPdfPath = path.join(TEMP_DIR, `upload_${Date.now()}.pdf`);
        try {
          await fs.writeFile(tempPdfPath, req.file.buffer);
          const parser = new pdfParse({ url: tempPdfPath });
          const result = await parser.getText();
          extractedText = result.text || "";
          await parser.destroy();
          console.log(`📄 PDF parsed: ${extractedText.length} chars`);
        } catch (pdfErr) {
          console.error("❌ pdf-parse error:", pdfErr.message);
          return res.status(400).json({
            success: false,
            error: `PDF parsing failed: ${pdfErr.message}`,
          });
        } finally {
          // Clean up temp file
          await fs.remove(tempPdfPath).catch(() => {});
        }
      } else {
        // .txt or .md — read as UTF-8 string
        extractedText = req.file.buffer.toString("utf-8");
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error:
            "Could not extract text from the file. The file may be scanned/image-based.",
        });
      }

      console.log(
        `📄 Extracted ${extractedText.length} chars from ${req.file.originalname}`,
      );
      res.json({ success: true, text: extractedText.trim() });
    } catch (error) {
      console.error("❌ File text extraction error:", error);
      res.status(500).json({
        success: false,
        error: `Failed to extract text: ${error.message}`,
      });
    }
  },
);

// API: Create new project
app.post("/api/projects/create", async (req, res) => {
  try {
    const { title, generateBoilerplate, userIdea, Owner, aiConfig } = req.body;
    const projectId = uuidv4();
    const projectPath = path.join(PROJECTS_DIR, projectId);
    await fs.ensureDir(projectPath);

    console.log("🆕 Creating new project:", title);

    // Normalize templateType
    let templateType = req.body.templateType || "article";
    if (templateType === "blank") templateType = "Blank Document";

    const templateSource = req.body.templateSource || "local";
    console.log("🆕 Project details:", templateType, templateSource);

    let files = {};

    // Default fallback content for Blank Document
    let mainContent = `\\documentclass{article}
\\usepackage{graphicx}
\\title{${title}}
\\author{Author Name}
\\date{\\today}
\\begin{document}
\\maketitle
\\section{Introduction}
 
\\end{document}`;

    // ==========================================
    // 1. LOAD LOCAL TEMPLATE FILES (IF ANY)
    // ==========================================
    if (templateType !== "Blank Document" && templateSource === "local") {
      const keyToFolder = {
        ieee_conference: "IEEE Conference",
        ieee_journal: "IEEE Journal",
        acm_manuscript: "ACM Manuscript",
        mla_format: "MLA Format",
        resume: "Resume",
        blank: "Blank Document",
      };

      const folderName = keyToFolder[templateType] || templateType;
      const builtInPath = path.join(TEMPLATES_DIR, folderName);
      const userPath = path.join(USER_TEMPLATES_DIR, folderName);

      const isBuiltIn = await fs.pathExists(builtInPath);
      const templatePath = isBuiltIn ? builtInPath : userPath;

      console.log(`📂 Reading template from: ${templatePath}`);
      files = await getTemplateFiles(templatePath);

      if (Object.keys(files).length === 0) {
        throw new Error(`Template not found or empty: ${folderName}`);
      }

      // Pre-fill title if the file exists
      if (files["title.tex"]) {
        files["title.tex"].content = title;
      }
    } else if (templateType === "Blank Document") {
      // Initialize the files object for a blank document
      files["main.tex"] = {
        name: "main.tex",
        content: mainContent,
        type: "tex",
      };
    } else {
      console.warn(
        `Server templates not yet implemented locally: ${templateType}`,
      );
      files["main.tex"] = {
        name: "main.tex",
        content: "% Server template placeholder",
        type: "tex",
      };
    }

    // ==========================================
    // 2. UNIFIED AI GENERATION BLOCK
    // ==========================================
    if (generateBoilerplate && userIdea) {
      try {
        console.log(`🤖 Generating boilerplate for ${templateType}...`);

        // Use frontend config if provided, otherwise fallback to local config.json
        // Strip apiKey — Python fetches it from CouchDB using the forwarded cookie
        const rawConfig = req.body.aiConfig || (await getActiveAIConfig());
        const { apiKey: _k, ...activeConfig } = rawConfig || {};

        console.log(
          `🤖 Boilerplate aiConfig: provider=${activeConfig?.provider}, id=${
            activeConfig?.id
          }, hasKey=${!!rawConfig?.apiKey}`,
        );

        if (!activeConfig?.provider) {
          console.error("❌ No AI config found for boilerplate generation");
          // Don't abort — let Python handle it (will try env key fallback)
        }

        // Build templateFiles map (just the file keys the AI should generate for)
        let templateFileKeys = [];
        if (templateType !== "Blank Document") {
          templateFileKeys = Object.keys(files).filter((k) => {
            if (k.endsWith(".gitkeep") || k === "main.tex" || k === "title.tex")
              return false;
            if (/\.(cls|sty|pdf|png|jpg|jpeg|gif|svg|eps)$/i.test(k))
              return false;
            return true;
          });
        }

        const currentAiUrl = getServerUrl();
        const aiResponse = await axios.post(
          `${currentAiUrl}/api/generate-boilerplate`, // Unified endpoint
          {
            userIdea,
            title,
            templateType,
            templateFiles: templateFileKeys,
            aiConfig: activeConfig,
          },
          {
            // CRITICAL: Forward the user's auth cookie to Python so it can decrypt their API keys
            headers: { Cookie: req.headers.cookie || "" },
          },
        );

        if (aiResponse.data.success) {
          if (
            templateType === "Blank Document" &&
            aiResponse.data.mainContent
          ) {
            files["main.tex"].content = aiResponse.data.mainContent;
            console.log("✅ AI-generated blank document content applied");
          } else if (aiResponse.data.fileUpdates) {
            // <-- Change to fileUpdates
            const generatedContent = aiResponse.data.fileUpdates; // <-- Change to fileUpdates
            let populated = 0;

            for (const [fileKey, content] of Object.entries(generatedContent)) {
              // Note: files[fileKey] is an object, so we update its .content property
              if (files[fileKey] && typeof content === "string") {
                files[fileKey].content = content;
                populated++;
              }
            }
            console.log(
              `✅ AI populated ${populated}/${templateFileKeys.length} template files`,
            );
          }
        } else {
          console.error(
            "⚠️ AI boilerplate generation failed:",
            aiResponse.data.error,
          );
        }
      } catch (error) {
        console.error(
          "❌ AI Generation Error:",
          error.response?.data || error.message,
        );
        // Fallback: templates/blank doc stay with their default static content
      }
    }

    // ==========================================
    // 3. SAVE FILES TO DISK & DB
    // ==========================================

    // Save all files
    for (const [relPath, fileData] of Object.entries(files)) {
      const filePath = path.join(projectPath, relPath);
      await fs.ensureDir(path.dirname(filePath));

      if (fileData.isImage) {
        const base64Data = fileData.content.split(";base64,").pop();
        await fs.writeFile(filePath, base64Data, { encoding: "base64" });
      } else {
        await fs.writeFile(filePath, fileData.content);
      }
    }

    // Create project.json
    // --- SMART ROOT FILE DETECTION FOR NEW PROJECTS ---
    let detectedRoot = "main.tex";
    if (!files["main.tex"]) {
      const texFiles = Object.keys(files).filter((k) => k.endsWith(".tex"));
      // Look for the file containing the \documentclass declaration
      const docClassFile = texFiles.find(
        (k) => files[k].content && files[k].content.includes("\\documentclass"),
      );

      if (docClassFile) {
        detectedRoot = docClassFile;
      } else if (texFiles.length > 0) {
        detectedRoot = texFiles[0];
      }
    }

    // Create project.json
    const projectData = {
      id: projectId,
      title,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      owner: Owner || "",
      files: files,
      activeFile: detectedRoot,
      rootFile: detectedRoot,
    };

    await fs.writeJSON(path.join(projectPath, "project.json"), projectData);

    console.log(`✅ Created project: ${title} (${projectId})`);
    res.json({ success: true, project: projectData });
  } catch (error) {
    console.error("❌ Project creation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create project",
      details: error.message,
    });
  }
});

// API: Upload existing project as ZIP
app.post(
  "/api/projects/upload",
  boilerplateUpload.single("file"), // Reusing boilerplateUpload memory storage limits
  async (req, res) => {
    try {
      if (!req.file || !req.file.originalname.endsWith(".zip")) {
        return res
          .status(400)
          .json({ success: false, error: "Must upload a .zip file" });
      }

      const zip = new AdmZip(req.file.buffer);
      const zipEntries = zip.getEntries();

      const files = {};
      let rootFile = null;
      let projectTitle = req.file.originalname.replace(/\.zip$/, ""); // Fallback title

      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;

        const pathParts = entry.entryName.split("/");
        // Ignore MacOS metadata and hidden files
        if (pathParts.some((p) => p.startsWith(".") || p === "__MACOSX"))
          continue;

        const relPath = entry.entryName;
        const ext = path.extname(relPath).toLowerCase();

        const textExts = [
          ".tex",
          ".bib",
          ".bst",
          ".sty",
          ".cls",
          ".txt",
          ".md",
          ".json",
        ];

        let content;
        let isImage = false;

        if (textExts.includes(ext)) {
          content = entry.getData().toString("utf8");
          // Check if this is the root file
          if (ext === ".tex" && content.includes("\\documentclass")) {
            rootFile = relPath;
          }
        } else {
          // Binary — store as base64
          const buffer = entry.getData();
          const mime =
            ext === ".png"
              ? "image/png"
              : ext === ".jpg" || ext === ".jpeg"
              ? "image/jpeg"
              : ext === ".pdf"
              ? "application/pdf"
              : "application/octet-stream";
          content = `data:${mime};base64,${buffer.toString("base64")}`;
          isImage = true;
        }

        files[relPath] = {
          name: path.basename(relPath),
          content,
          type: ext.slice(1),
          ...(isImage && { isImage: true }),
        };
      }

      if (Object.keys(files).length === 0) {
        return res.status(400).json({
          success: false,
          error: "ZIP file is empty or contains no valid files.",
        });
      }

      // Fallback for root file if no \documentclass is found
      if (!rootFile) {
        if (files["main.tex"]) rootFile = "main.tex";
        else {
          const texFiles = Object.keys(files).filter((k) => k.endsWith(".tex"));
          rootFile = texFiles.length > 0 ? texFiles[0] : Object.keys(files)[0];
        }
      }

      const projectId = uuidv4();
      const projectPath = path.join(PROJECTS_DIR, projectId);
      await fs.ensureDir(projectPath);

      // Save files to disk
      for (const [relPath, fileData] of Object.entries(files)) {
        const filePath = path.join(projectPath, relPath);
        await fs.ensureDir(path.dirname(filePath));

        if (fileData.isImage) {
          const base64Data = fileData.content.split(";base64,").pop();
          await fs.writeFile(filePath, base64Data, { encoding: "base64" });
        } else {
          await fs.writeFile(filePath, fileData.content);
        }
      }

      const projectData = {
        id: projectId,
        title: projectTitle,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        owner: "",
        files: files,
        activeFile: rootFile,
      };

      await fs.writeJSON(path.join(projectPath, "project.json"), projectData);

      console.log(`✅ Uploaded project: ${projectTitle} (${projectId})`);
      res.json({ success: true, project: projectData });
    } catch (error) {
      console.error("❌ Project upload error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload project",
        details: error.message,
      });
    }
  },
);

// API: List all projects
app.get("/api/projects", async (req, res) => {
  try {
    const projects = [];
    const projectDirs = await fs.readdir(PROJECTS_DIR);

    for (const dir of projectDirs) {
      try {
        const projectPath = path.join(PROJECTS_DIR, dir, "project.json");
        if (await fs.pathExists(projectPath)) {
          const projectData = await fs.readJSON(projectPath);
          projects.push({
            id: projectData.id,
            title: projectData.title,
            created: projectData.created,
            modified: projectData.modified,
          });
        }
      } catch (error) {
        console.error(`Error reading project ${dir}:`, error);
      }
    }

    projects.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    res.json(projects);
  } catch (error) {
    console.error("❌ Projects list error:", error);
    res.status(500).json({ success: false, error: "Failed to list projects" });
  }
});

app.delete("/api/projects/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const projectDir = path.join(PROJECTS_DIR, id);

    // Check if the directory exists before attempting deletion
    if (!(await fs.pathExists(projectDir))) {
      return res
        .status(404)
        .json({ success: false, error: "Project directory not found" });
    }

    // fs.remove (from fs-extra) deletes the directory and all its contents
    await fs.remove(projectDir);

    console.log(`\u2705 Deleted project directory: ${id}`);
    res.json({
      success: true,
      message: "Project deleted successfully from disk",
    });
  } catch (error) {
    console.error("\u274C Project deletion error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete project folder" });
  }
});
// API: Rename project
app.put("/api/projects/rename/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const projectPath = path.join(PROJECTS_DIR, id, "project.json");

    if (!(await fs.pathExists(projectPath))) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });
    }

    const projectData = await fs.readJSON(projectPath);
    projectData.title = title;
    projectData.modified = new Date().toISOString();

    await fs.writeJSON(projectPath, projectData, { spaces: 2 });
    console.log(`✅ Renamed project to: ${title} (${id})`);
    res.json({
      success: true,
      message: "Project renamed successfully",
      project: projectData,
    });
  } catch (error) {
    console.error("❌ Project rename error:", error);
    res.status(500).json({ success: false, error: "Failed to rename project" });
  }
});

// API: Load project
app.get("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const projectPath = path.join(PROJECTS_DIR, id, "project.json");

    if (!(await fs.pathExists(projectPath))) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });
    }

    const projectData = await fs.readJSON(projectPath);
    const projectDir = path.join(PROJECTS_DIR, id);

    for (const [fileName, fileInfo] of Object.entries(projectData.files)) {
      const filePath = path.join(projectDir, fileName);
      if (await fs.pathExists(filePath)) {
        // Binary files (images, PDFs) — read as base64 data URI
        if (fileInfo.isImage) {
          const ext = path.extname(fileName).toLowerCase();
          const mimeMap = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".pdf": "application/pdf",
            ".eps": "application/postscript",
          };
          const mime = mimeMap[ext] || "application/octet-stream";
          const buffer = await fs.readFile(filePath);
          fileInfo.content = `data:${mime};base64,${buffer.toString("base64")}`;
        } else {
          fileInfo.content = await fs.readFile(filePath, "utf8");
        }
      }
    }

    console.log(`✅ Loaded project: ${projectData.title} (${id})`);
    res.json({ success: true, project: projectData });
  } catch (error) {
    console.error("❌ Project load error:", error);
    res.status(500).json({ success: false, error: "Failed to load project" });
  }
});

// API: Save project content
app.put("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { files, owner, activeFile, title, rootFile } = req.body;
    const projectDir = path.join(PROJECTS_DIR, id);
    const projectPath = path.join(projectDir, "project.json");

    // console.log("✅ owner ✅", owner);
    console.log("✅ title ✅", title);

    if (!(await fs.pathExists(projectPath))) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });
    }

    // Load existing project data
    const projectData = await fs.readJSON(projectPath);

    // Update project data
    projectData.files = files;
    projectData.owner = owner;
    projectData.title = title;
    projectData.activeFile = activeFile || projectData.activeFile;
    if (rootFile !== undefined) projectData.rootFile = rootFile;
    projectData.modified = new Date().toISOString();

    // Save updated project.json
    await fs.writeJSON(projectPath, projectData, { spaces: 2 });

    // ⭐ IMPORTANT: Write each file to disk
    for (const [fileName, fileInfo] of Object.entries(files)) {
      // Skip .gitkeep placeholder files
      if (fileName.endsWith("/.gitkeep") || fileInfo.name === ".gitkeep") {
        // Just ensure the directory exists
        const dirPath = path.dirname(path.join(projectDir, fileName));
        await fs.ensureDir(dirPath);
        continue;
      }

      const filePath = path.join(projectDir, fileName);
      await fs.ensureDir(path.dirname(filePath));

      // Binary files (images, PDFs) with data: URI — write as binary
      if (
        fileInfo.isImage &&
        fileInfo.content &&
        fileInfo.content.startsWith("data:")
      ) {
        const base64Match = fileInfo.content.match(/^data:[^;]+;base64,(.+)$/);
        if (base64Match) {
          await fs.writeFile(filePath, Buffer.from(base64Match[1], "base64"));
        } else {
          await fs.writeFile(filePath, fileInfo.content, "utf8");
        }
      } else {
        await fs.writeFile(filePath, fileInfo.content || "", "utf8");
      }
      console.log(`✅ Saved ${fileName} to disk`);
    }

    console.log(`✅ Saved project: ${projectData.title} (${id})`);
    res.json({ success: true, message: "Project saved successfully" });
  } catch (error) {
    console.error("❌ Project save error:", error);
    res.status(500).json({ success: false, error: "Failed to save project" });
  }
});

// API: Delete specific file from project
app.delete("/api/projects/:id/files/:filename", async (req, res) => {
  try {
    const { id } = req.params;
    const filename = decodeURIComponent(req.params.filename);
    const projectDir = path.join(PROJECTS_DIR, id);
    const projectPath = path.join(projectDir, "project.json");
    const filePath = path.join(projectDir, filename);

    if (!(await fs.pathExists(projectPath))) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });
    }

    // Load project data
    const projectData = await fs.readJSON(projectPath);

    // Remove from project.json
    if (projectData.files[filename]) {
      delete projectData.files[filename];

      // If we deleted the active file, switch to main.tex
      if (projectData.activeFile === filename) {
        projectData.activeFile = "main.tex";
      }

      projectData.modified = new Date().toISOString();
      await fs.writeJSON(projectPath, projectData, { spaces: 2 });
    }

    // Delete from disk
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }

    console.log(`✅ Deleted file ${filename} from project ${id}`);

    // Populate remaining file contents to keep frontend in sync
    for (const [fName, fInfo] of Object.entries(projectData.files)) {
      const p = path.join(projectDir, fName);
      if (await fs.pathExists(p)) {
        if (fInfo.isImage) {
          const ext = path.extname(fName).toLowerCase();
          const mimeMap = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".pdf": "application/pdf",
            ".eps": "application/postscript",
          };
          const mime = mimeMap[ext] || "application/octet-stream";
          const buffer = await fs.readFile(p);
          fInfo.content = `data:${mime};base64,${buffer.toString("base64")}`;
        } else {
          fInfo.content = await fs.readFile(p, "utf8");
        }
      }
    }

    res.json({ success: true, project: projectData });
  } catch (error) {
    console.error("❌ File deletion error:", error);
    res.status(500).json({ success: false, error: "Failed to delete file" });
  }
});

// API: Export project as ZIP
app.get("/api/projects/:id/export-zip", async (req, res) => {
  try {
    const { id } = req.params;
    const projectDir = path.join(PROJECTS_DIR, id);

    if (!(await fs.pathExists(projectDir))) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });
    }

    const projectData = await fs.readJSON(
      path.join(projectDir, "project.json"),
    );
    const zip = new AdmZip();

    // Add files to ZIP from project.json list
    for (const fileName of Object.keys(projectData.files)) {
      const filePath = path.join(projectDir, fileName);
      if (await fs.pathExists(filePath)) {
        zip.addLocalFile(filePath);
      }
    }

    // Include the project configuration itself
    zip.addLocalFile(path.join(projectDir, "project.json"));

    const zipBuffer = zip.toBuffer();
    const zipName = `${projectData.title || "project"}.zip`;

    console.log(`📦 Exporting project ${id} as ${zipName}`);

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}"`,
      "Content-Length": zipBuffer.length,
    });

    res.send(zipBuffer);
  } catch (error) {
    console.error("❌ ZIP Export Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to export project as ZIP" });
  }
});

// API: Delete project

// server.js - Add these new routes

// API: Save Chat Message
app.post("/api/projects/:id/chat/save", async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const projectDir = path.join(PROJECTS_DIR, id);
    const chatPath = path.join(projectDir, "chat.json");

    if (!(await fs.pathExists(projectDir))) {
      return res.status(404).json({ error: "Project not found" });
    }

    let chatHistory = [];
    if (await fs.pathExists(chatPath)) {
      chatHistory = await fs.readJSON(chatPath);
    }

    // Append new message (stripping interactive properties like 'isAction' for storage)
    // We only store the text, sender, timestamp, and snippet (for reference)
    const storedMessage = {
      id: message.id,
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp,
      snippet: message.snippet || null,
      isError: message.isError || false,
    };

    chatHistory.push(storedMessage);

    await fs.writeJSON(chatPath, chatHistory, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Chat Save Error:", error);
    res.status(500).json({ error: "Failed to save chat" });
  }
});

// API: Load Chat History
app.get("/api/projects/:id/chat", async (req, res) => {
  try {
    const { id } = req.params;
    const chatPath = path.join(PROJECTS_DIR, id, "chat.json");

    if (await fs.pathExists(chatPath)) {
      const history = await fs.readJSON(chatPath);
      res.json({ success: true, history });
    } else {
      res.json({ success: true, history: [] }); // Empty history for new projects
    }
  } catch (error) {
    console.error("❌ Chat Load Error:", error);
    res.status(500).json({ error: "Failed to load chat" });
  }
});

// API: Compile LaTeX (for projects)
// Convert to C++
app.post("/api/compile", async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("NEW COMPILATION REQUEST");
  console.log("=".repeat(60));

  if (!PDFLATEX_PATH) {
    return res.status(500).json({
      success: false,
      error: "pdfLaTeX not available",
      message: "Please install MiKTeX or TeX Live",
    });
  }

  try {
    const { content, projectId, files, activeFile } = req.body;

    if (!content) {
      return res
        .status(400)
        .json({ success: false, error: "No LaTeX content" });
    }

    const filename = projectId ?? `temp_project_${Date.now()}`;
    const jobDir = path.join(TEMP_DIR, `job_${filename}_${Date.now()}`);
    await fs.ensureDir(jobDir);

    console.log(`Project ID: ${projectId}`);
    console.log(`Target Filename: ${filename}`);
    console.log(`Job Directory: ${jobDir}`);

    // Default to activeFile from client
    let mainTexFile = activeFile || "main.tex";

    // Write all project files to jobDir, preserving directory structure
    for (const [relPath, file] of Object.entries(files)) {
      if (file.name === ".gitkeep" || relPath.endsWith("/.gitkeep")) continue;

      const filePath = path.join(jobDir, relPath);
      await fs.ensureDir(path.dirname(filePath));

      console.log("Writing file:", relPath);

      if (file.isImage && file.content && file.content.startsWith("data:")) {
        const base64Match = file.content.match(/^data:[^;]+;base64,(.+)$/);
        if (base64Match) {
          const base64Data = base64Match[1];
          const buffer = Buffer.from(base64Data, "base64");
          await fs.writeFile(filePath, buffer);
          console.log(`✅ Written image file as binary: ${relPath}`);
        } else {
          await fs.writeFile(filePath, file.content, "utf8");
        }
      } else {
        await fs.writeFile(filePath, file.content || "", "utf8");
      }
    }

    const compileTexInputs = [];
    if (projectId) {
      const diskDefsDir = path.join(PROJECTS_DIR, projectId, "Definitions");
      if (await fs.pathExists(diskDefsDir)) {
        compileTexInputs.push(diskDefsDir + "//");
        console.log(`📎 Adding Definitions to TEXINPUTS: ${diskDefsDir}`);
      }
    }

    const texPath = path.join(jobDir, mainTexFile);
    const pdfPath = path.join(OUTPUT_DIR, `${filename}.pdf`);

    // Remove old PDF/SyncTeX to ensure fresh compile
    try {
      await fs.remove(pdfPath);
      await fs.remove(path.join(OUTPUT_DIR, `${filename}.synctex.gz`));
    } catch (e) {}

    console.log("🔄 Running PDFLaTeX...");

    function needsRerun(log) {
      return (
        log.includes("Rerun to get") ||
        log.includes("Label(s) may have changed") ||
        log.includes("Citation(s) may have changed")
      );
    }

    // ⭐ TARGET JOB_DIR INSTEAD OF OUTPUT_DIR ⭐
    const mainTexBaseName = path.basename(mainTexFile, ".tex");
    const generatedPdfPath = path.join(jobDir, `${mainTexBaseName}.pdf`);
    const generatedSynctexPath = path.join(
      jobDir,
      `${mainTexBaseName}.synctex.gz`,
    );
    const generatedLogPath = path.join(jobDir, `${mainTexBaseName}.log`);

    let result1 = { stdout: "", stderr: "", code: 0 };
    let pdfExists = false;
    let usedParallel = false;

    if (!usedParallel) {
      console.log("🔄 Running serial PDFLaTeX compilation...");

      // ⭐ COMPILE INSIDE JOB DIR ⭐
      result1 = await runPdfLatexPermissive(texPath, jobDir, compileTexInputs);

      try {
        const installed = await installMissingPackages(
          result1.stdout,
          getTlmgrPath(),
          (msg) => console.log(`[Package Installer] ${msg}`),
        );

        if (installed.length > 0) {
          console.log(
            `📦 Installed ${installed.length} missing packages. Retrying compilation...`,
          );
          result1 = await runPdfLatexPermissive(
            texPath,
            jobDir,
            compileTexInputs,
          );
        }
      } catch (pkgErr) {
        console.warn("⚠️ Package installation failed:", pkgErr.message);
      }

      pdfExists = await fs.pathExists(generatedPdfPath);
    }

    // Run BibTeX if any .bib files exist
    const hasBibFiles = Object.keys(files).some((k) => k.endsWith(".bib"));
    if (pdfExists && hasBibFiles) {
      try {
        // Only need to copy .bst files from Definitions, .bib files are already in jobDir
        if (projectId) {
          const diskDefsDir = path.join(PROJECTS_DIR, projectId, "Definitions");
          if (await fs.pathExists(diskDefsDir)) {
            const defEntries = await fs.readdir(diskDefsDir, {
              withFileTypes: true,
            });
            for (const entry of defEntries) {
              if (entry.isFile() && entry.name.endsWith(".bst")) {
                await fs.copy(
                  path.join(diskDefsDir, entry.name),
                  path.join(jobDir, entry.name), // Copy to jobDir
                );
              }
            }
          }
        }

        console.log("📚 Running BibTeX...");
        await new Promise((resolve) => {
          require("child_process").execFile(
            "bibtex",
            [mainTexBaseName],
            { cwd: jobDir, timeout: 30000 }, // ⭐ RUN IN JOB DIR ⭐
            (error, stdout, stderr) => {
              if (error)
                console.warn(
                  "⚠️ BibTeX warning/error:",
                  stderr || error.message,
                );
              resolve();
            },
          );
        });
      } catch (bibErr) {
        console.warn("⚠️ BibTeX skipped:", bibErr.message);
      }
    }

    if (needsRerun(result1.stdout)) {
      console.log("🔄 Rerunning PDFLaTeX (Pass 2)...");
      result1 = await runPdfLatexPermissive(texPath, jobDir, compileTexInputs);

      const result2 = await runPdfLatexPermissive(
        texPath,
        jobDir,
        compileTexInputs,
      );
      if (result2) result1 = result2;
    }

    pdfExists = await fs.pathExists(generatedPdfPath);

    if (pdfExists) {
      // ⭐ MOVE FILES FROM JOB_DIR TO OUTPUT_DIR ⭐
      await fs.move(generatedPdfPath, pdfPath, { overwrite: true });

      if (await fs.pathExists(generatedSynctexPath)) {
        const targetSynctexPath = path.join(
          OUTPUT_DIR,
          `${filename}.synctex.gz`,
        );
        await fs.move(generatedSynctexPath, targetSynctexPath, {
          overwrite: true,
        });
      }

      if (await fs.pathExists(generatedLogPath)) {
        await fs.move(
          generatedLogPath,
          path.join(OUTPUT_DIR, `${mainTexBaseName}.log`),
          { overwrite: true },
        );
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.pdf"`,
      );
      res.setHeader("X-Log-File", `${mainTexBaseName}.log`);

      const stream = fs.createReadStream(pdfPath);
      stream.pipe(res);

      stream.on("error", (err) => {
        console.error(err);
        res.status(500).end();
      });
    } else {
      // Move the log file even if it failed so frontend can debug
      if (await fs.pathExists(generatedLogPath)) {
        await fs.move(
          generatedLogPath,
          path.join(OUTPUT_DIR, `${mainTexBaseName}.log`),
          { overwrite: true },
        );
      }

      res.setHeader("X-Log-File", `${mainTexBaseName}.log`);
      res.status(400).json({
        success: false,
        error: "Compilation failed",
        log: result1.stdout,
      });
    }

    res.on("finish", () => {
      fs.remove(jobDir).catch((err) =>
        console.error(`Cleanup failed for ${jobDir}:`, err),
      );
    });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== LATEX MATH EQUATION ROUTES ====================

// Test endpoint for pdflatex
app.get("/api/test-pdflatex", async (req, res) => {
  try {
    const testLatex = `\\documentclass{article}
\\begin{document}
Hello World
\\end{document}`;

    // const testFile = path.join(TEMP_DIR, "test.tex");
    const testFile = path.join(jobDir, "test.tex");
    await fs.writeFile(testFile, testLatex);

    console.log("Testing pdflatex...");
    const result = await runPdfLatexPermissive(testFile, OUTPUT_DIR);

    const pdfExists = await fs.pathExists(path.join(OUTPUT_DIR, "test.pdf"));

    res.json({
      success: pdfExists,
      exitCode: result.code,
      pdfExists,
      stdoutLength: result.stdout?.length,
      stderrLength: result.stderr?.length,
      stdout: result.stdout?.slice(0, 500),
      stderr: result.stderr?.slice(0, 500),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

// API: Compile LaTeX (for math equations OR sections)
app.post("/api/latex/compile", async (req, res) => {
  console.log("📝 Received LaTeX compilation request");
  // Each preview gets its own temp dir — avoids collisions and guarantees a
  // writable working directory in PROD (TinyTex) mode.
  const previewJobDir = path.join(
    TEMP_DIR,
    `preview_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  );
  try {
    await fs.ensureDir(previewJobDir);

    const {
      latex,
      preamble,
      projectId,
      isTemp = true,
      fileName = "temp",
      format = "pdf",
      type = "equation", // Default to 'equation', but can be 'section'
    } = req.body;

    if (!latex) {
      return res.status(400).json({ error: "LaTeX code is required" });
    }

    let cleanLatex = latex
      .replace(/```latex/gi, "")
      .replace(/```/g, "")
      .trim();

    let extraPackages = "";
    cleanLatex = cleanLatex.replace(
      /\usepackage(?:\[.*?\])?{.*?}/g,
      (match) => {
        extraPackages += match + "\n";
        return ""; // Remove it from the body
      },
    );

    cleanLatex = cleanLatex.replace(/\documentclass(?:\[.*?\])?{.*?}/g, "");
    cleanLatex = cleanLatex.replace(/\begin{document}/g, "");
    cleanLatex = cleanLatex.replace(/\end{document}/g, "");
    cleanLatex = cleanLatex.trim();

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const baseFileName = isTemp ? "temp" : sanitizedFileName;
    const texFileName = `${baseFileName}.tex`;
    const pdfFileName = `${baseFileName}.pdf`;
    const imgFileName = `${baseFileName}.png`;
    const texFilePath = path.join(previewJobDir, texFileName);
    const pdfFilePath = path.join(OUTPUT_DIR, pdfFileName);
    const imgFilePath = path.join(OUTPUT_DIR, imgFileName);

    // If the request comes from within a project, point TEXINPUTS at the project root
    // and its subdirectories (// suffix) so pdflatex can find images, .cls/.sty, etc.
    const previewTexInputs = [];
    if (projectId) {
      const diskProjDir = path.join(PROJECTS_DIR, String(projectId));
      if (await fs.pathExists(diskProjDir)) {
        previewTexInputs.push(diskProjDir + "//");
        console.log(`📎 Preview TEXINPUTS added: ${diskProjDir}`);
      }
    }

    let minimalLatexDocument = "";

    if (preamble) {
      // Use the User's Real Preamble
      minimalLatexDocument = `${preamble}\n${cleanLatex}\n\\end{document}`;
      console.log(minimalLatexDocument);
    } else if (type === "table") {
      // For TABLE preview
      minimalLatexDocument = `\\documentclass[preview,border=12pt,varwidth=15cm]{standalone}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage[final]{graphicx}
\\usepackage{multirow}
\\usepackage{xcolor}
\\usepackage{caption}
\\usepackage{tabularx}
\\usepackage{longtable}
\\usepackage{booktabs}
${extraPackages}
\\begin{document}
${cleanLatex}
\\end{document}`;
    } else if (type === "figure") {
      // OPTION for FIGURE preview - Ensure [final] for graphicx to avoid placeholders
      minimalLatexDocument = `\\documentclass[preview, border=12pt,varwidth=15cm]{standalone}
\\usepackage[final]{graphicx}
\\usepackage{caption}
\\usepackage{xcolor}
${extraPackages}
\\begin{document}
${cleanLatex}
\\end{document}`;
    } else if (type === "section") {
      // OPTION B: Fallback Section Template
      minimalLatexDocument = `\\documentclass[preview,border=12pt,varwidth=15cm]{standalone}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage[final]{graphicx}
\\usepackage{xcolor}
\\usepackage{tabularx}
\\usepackage{booktabs}
${extraPackages}
\\begin{document}
${cleanLatex}
\\end{document}`;
    } else {
      // OPTION C: Equation Mode
      minimalLatexDocument = `\\documentclass[border=2pt,varwidth=true]{standalone}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{mathtools}
\\usepackage{xcolor}
${extraPackages}
\\begin{document}
\\begin{displaymath}
${cleanLatex.replace(/[‹›]/g, "")}
\\end{displaymath}
\\end{document}`;
    }

    await fs.writeFile(texFilePath, minimalLatexDocument, "utf8");
    console.log("📄 Writing LaTeX file:", texFileName);

    // Run the permissive compiler in the job directory to avoid collisions
    // Run the permissive compiler in the job directory to avoid collisions
    let result = await runPdfLatexPermissive(
      texFilePath,
      previewJobDir,
      previewTexInputs,
    );

    // Dynamic package installation support for previews
    try {
      const tlmgrPath = getTlmgrPath();
      if (tlmgrPath) {
        const installed = await installMissingPackages(
          result.stdout,
          tlmgrPath,
          (msg) => console.log(`[Preview Package Installer] ${msg}`),
        );

        if (installed.length > 0) {
          console.log(
            `📦 Installed ${installed.length} missing packages for preview. Retrying...`,
          );
          result = await runPdfLatexPermissive(
            texFilePath,
            previewJobDir,
            previewTexInputs,
          );
        }
      }
    } catch (pkgErr) {
      console.warn("⚠️ Preview package installation failed:", pkgErr.message);
    }

    // Verify PDF exists in the job directory
    const jobPdfPath = path.join(previewJobDir, pdfFileName);
    const pdfExists = await fs.pathExists(jobPdfPath);

    if (!pdfExists) {
      const logPath = path.join(previewJobDir, `${baseFileName}.log`);
      let logContent = "";
      try {
        logContent = await fs.readFile(logPath, "utf8");
      } catch (logErr) {
        logContent = "No log file found.";
      }

      // Extract the actual error from the log
      const errorMatch =
        logContent.match(/!(.*?)l\.(\d+)/s) || logContent.match(/!(.*?)==>/s);
      const errorMessage = errorMatch ? errorMatch[0] : "Check LaTeX syntax.";

      throw new Error(
        `PDF compilation failed. Error: ${errorMessage}\n\nFull Log Context: ${logContent.slice(
          -1000,
        )}`,
      );
    }

    // Copy the successful results to the public OUTPUT_DIR
    await fs.copy(jobPdfPath, pdfFilePath);

    let finalUrl = `/output/${pdfFileName}`;
    let finalFileName = pdfFileName;

    if (format === "image" || format === "png") {
      try {
        console.log("🖼️ Converting PDF to image...");
        const jobImgPath = path.join(previewJobDir, imgFileName);
        const rawImagePath = await convertPdfToImage(jobPdfPath, jobImgPath);

        const jobCroppedImgPath = path.join(
          previewJobDir,
          `cropped_${imgFileName}`,
        );
        const publicCroppedImgPath = path.join(
          OUTPUT_DIR,
          `cropped_${imgFileName}`,
        );

        await cropImageToContent(rawImagePath, jobCroppedImgPath);
        await fs.copy(jobCroppedImgPath, publicCroppedImgPath);

        finalUrl = `/output/cropped_${imgFileName}`;
        finalFileName = `cropped_${imgFileName}`;
      } catch (imageError) {
        console.error("⚠️ Image conversion failed:", imageError.message);
        // Fallback to serving PDF if image conversion fails
      }
    }

    // Only cleanup the temporary job directory, leave OUTPUT_DIR content for serving
    fs.remove(previewJobDir).catch((err) =>
      console.error("Cleanup error:", err),
    );

    res.json({
      success: true,
      pdfUrl: finalUrl,
      fileName: finalFileName,
      format: finalUrl.endsWith(".png") ? "image" : "pdf",
    });
  } catch (error) {
    console.error("❌ Compilation error:", error.message);
    res.status(500).json({
      error: `Compilation failed: ${error.message}`,
      details: error.stack,
    });
  } finally {
    // Always clean up the isolated preview job directory
    fs.remove(previewJobDir).catch((err) =>
      console.error(`Preview cleanup failed for ${previewJobDir}:`, err),
    );
  }
});

// API: Save equation
app.post("/api/equations/save", async (req, res) => {
  console.log("💾 Received equation save request");
  try {
    const { fileName, latex, projectId } = req.body;
    if (!fileName || !latex) {
      return res.status(400).json({ error: "fileName and latex are required" });
    }

    const targetDir = projectId
      ? path.join(PROJECTS_DIR, String(projectId), "equations")
      : EQUATIONS_DIR;
    await fs.ensureDir(targetDir);

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fullFileName = `${sanitizedFileName}.tex`;
    const filePath = path.join(targetDir, fullFileName);

    await fs.writeFile(filePath, latex, "utf8");
    console.log("✅ Equation saved successfully:", sanitizedFileName);

    res.json({
      success: true,
      fileName: sanitizedFileName,
      message: "Equation saved successfully",
    });
  } catch (error) {
    console.error("❌ Save error:", error);
    res.status(500).json({
      error: `Save failed: ${error.message}`,
      details: error.stack,
    });
  }
});

// API: List all saved equations
app.get("/api/equations/list", async (req, res) => {
  console.log("📋 Received request to list equations");
  try {
    const { projectId } = req.query;
    const targetDir = projectId
      ? path.join(PROJECTS_DIR, String(projectId), "equations")
      : EQUATIONS_DIR;
    await fs.ensureDir(targetDir);

    const files = await fs.readdir(targetDir);
    const texFiles = files.filter((file) => file.endsWith(".tex"));
    console.log(`📚 Found ${texFiles.length} equation files`);

    const equations = await Promise.all(
      texFiles.map(async (file) => {
        const filePath = path.join(targetDir, file);
        const content = await fs.readFile(filePath, "utf8");
        const stats = await fs.stat(filePath);
        const fileName = path.basename(file, ".tex");

        return {
          fileName: fileName,
          latex: content,
          lastModified: stats.mtime,
          fileSize: stats.size,
        };
      }),
    );

    equations.sort(
      (a, b) => new Date(b.lastModified) - new Date(a.lastModified),
    );
    res.json(equations);
  } catch (error) {
    console.error("❌ List error:", error);
    res.status(500).json({
      error: `Failed to list equations: ${error.message}`,
      details: error.stack,
    });
  }
});

// API: Load a specific equation
app.get("/api/equations/load/:filename", async (req, res) => {
  console.log("📖 Received request to load equation:", req.params.filename);
  try {
    const { filename } = req.params;
    const { projectId } = req.query;
    const targetDir = projectId
      ? path.join(PROJECTS_DIR, String(projectId), "equations")
      : EQUATIONS_DIR;
    const sanitizedFileName = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fullFileName = `${sanitizedFileName}.tex`;
    const filePath = path.join(targetDir, fullFileName);

    try {
      await fs.access(filePath);
    } catch {
      console.log("❌ Equation file not found:", fullFileName);
      return res.status(404).json({ error: "Equation file not found" });
    }

    const content = await fs.readFile(filePath, "utf8");
    const stats = await fs.stat(filePath);

    console.log("✅ Equation loaded successfully:", sanitizedFileName);
    res.json({
      fileName: sanitizedFileName,
      latex: content,
      lastModified: stats.mtime,
      fileSize: stats.size,
    });
  } catch (error) {
    console.error("❌ Load error:", error);
    res.status(500).json({
      error: `Failed to load equation: ${error.message}`,
      details: error.stack,
    });
  }
});

// API: Delete an equation
app.delete("/api/equations/:filename", async (req, res) => {
  console.log("🗑️ Received request to delete equation:", req.params.filename);
  try {
    const { filename } = req.params;
    const { projectId } = req.query;
    const targetDir = projectId
      ? path.join(PROJECTS_DIR, String(projectId), "equations")
      : EQUATIONS_DIR;
    const sanitizedFileName = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fullFileName = `${sanitizedFileName}.tex`;
    const filePath = path.join(targetDir, fullFileName);

    await fs.unlink(filePath);
    console.log("✅ Equation deleted successfully:", sanitizedFileName);

    res.json({
      success: true,
      message: "Equation deleted successfully",
      fileName: sanitizedFileName,
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(
        "❌ Equation file not found for deletion:",
        req.params.filename,
      );
      return res.status(404).json({ error: "Equation file not found" });
    }

    console.error("❌ Delete error:", error);
    res.status(500).json({
      error: `Failed to delete equation: ${error.message}`,
      details: error.stack,
    });
  }
});

// ==================== CITATION ROUTES ====================

app.get("/api/citation/doi-lookup", async (req, res) => {
  const { doi } = req.query;
  if (!doi) {
    return res.status(400).json({ success: false, error: "DOI is required" });
  }

  try {
    // Clean the DOI (handle full URLs or plain DOIs)
    const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//, "").trim();
    console.log(`🔍 Looking up DOI: ${cleanDoi}`);

    const response = await axios.get(
      `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`,
      {
        headers: {
          "User-Agent": "DocierePro/1.0 (mailto:support@dociere.com)",
        },
        timeout: 10000,
      },
    );

    const item = response.data.message;

    // Extract author names
    const authors = (item.author || [])
      .map((a) => {
        if (a.given && a.family) return `${a.given[0]}. ${a.family}`;
        if (a.family) return a.family;
        if (a.name) return a.name;
        return "";
      })
      .filter(Boolean)
      .join(", ");

    // Extract year
    const dateParts =
      item.published?.["date-parts"]?.[0] ||
      item["published-print"]?.["date-parts"]?.[0] ||
      item["published-online"]?.["date-parts"]?.[0] ||
      [];
    const year = dateParts[0] ? String(dateParts[0]) : "";

    // Extract pages
    const pages = item.page || "";

    // Extract volume and issue
    const volume = item.volume || "";
    const issue = item.issue || "";

    // Extract journal
    const journal =
      (item["container-title"] && item["container-title"][0]) ||
      (item["short-container-title"] && item["short-container-title"][0]) ||
      "";

    // Extract title
    const title = (item.title && item.title[0]) || "";

    console.log(`✅ DOI resolved: "${title}" by ${authors}`);

    res.json({
      success: true,
      data: {
        authors,
        title,
        journal,
        volume,
        issue,
        pages,
        year,
        doi: cleanDoi,
      },
    });
  } catch (error) {
    console.error(`❌ DOI lookup failed:`, error.message);
    const status = error.response?.status;
    if (status === 404) {
      return res.status(404).json({
        success: false,
        error: "DOI not found. Please check the DOI and try again.",
      });
    }
    res.status(500).json({
      success: false,
      error: "Failed to fetch DOI metadata. Please try again.",
    });
  }
});

// API: Academic Search (Unified query for Title/Author/Journal)
app.get("/api/citation/search", async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ success: false, error: "Query is required" });
  }

  try {
    console.log(`🔎 Searching academics for: "${q}"`);
    const response = await axios.get(`https://api.crossref.org/works`, {
      params: {
        query: q,
        rows: 10,
      },
      headers: {
        "User-Agent": "DocierePro/1.0 (mailto:support@dociere.com)",
      },
      timeout: 10000,
    });

    const items = response.data.message.items || [];

    // Normalize items
    const results = items.map((item) => {
      // Extract author names
      const authors = (item.author || [])
        .map((a) => {
          if (a.given && a.family) return `${a.given[0]}. ${a.family}`;
          if (a.family) return a.family;
          if (a.name) return a.name;
          return "";
        })
        .filter(Boolean)
        .join(", ");

      // Extract year
      const dateParts =
        item.published?.["date-parts"]?.[0] ||
        item["published-print"]?.["date-parts"]?.[0] ||
        item["published-online"]?.["date-parts"]?.[0] ||
        [];
      const year = dateParts[0] ? String(dateParts[0]) : "";

      // Extract journal
      const journal =
        (item["container-title"] && item["container-title"][0]) ||
        (item["short-container-title"] && item["short-container-title"][0]) ||
        "";

      return {
        authors,
        title: (item.title && item.title[0]) || "Untitled",
        journal,
        year,
        doi: item.DOI || "",
        volume: item.volume || "",
        issue: item.issue || "",
        pages: item.page || "",
        publisher: item.publisher || "",
      };
    });

    res.json({ success: true, results });
  } catch (error) {
    console.error(`❌ Search failed:`, error.message);
    res.status(500).json({
      success: false,
      error: "Academic search failed. Please try again.",
    });
  }
});

// API: Compile citation
app.post("/api/citation/compile", async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("📚 CITATION COMPILATION REQUEST");
  console.log("=".repeat(60));

  try {
    const {
      authors,
      title,
      journal,
      volume,
      issue,
      pages,
      year,
      doi,
      format,
      citationNumber,
      customLatex,
    } = req.body;

    let citationLatex = "";

    if (customLatex) {
      console.log("🔄 Using custom LaTeX");
      citationLatex = customLatex;
    } else {
      console.log("🆕 Generating citation from form data");
      if (!authors || !title || !year) {
        return res.status(400).json({
          error: "Authors, title, and year are required",
        });
      }

      switch (format) {
        case "IEEE":
          citationLatex = generateIEEECitation({
            authors,
            title,
            journal,
            volume,
            issue,
            pages,
            year,
            doi,
          });
          break;
        case "APA":
          citationLatex = generateAPACitation({
            authors,
            title,
            journal,
            volume,
            issue,
            pages,
            year,
            doi,
          });
          break;
        case "MLA":
          citationLatex = generateMLACitation({
            authors,
            title,
            journal,
            volume,
            issue,
            pages,
            year,
          });
          break;
        case "Chicago":
          citationLatex = generateChicagoCitation({
            authors,
            title,
            journal,
            volume,
            issue,
            pages,
            year,
            doi,
          });
          break;
        case "Harvard":
          citationLatex = generateHarvardCitation({
            authors,
            title,
            journal,
            volume,
            issue,
            pages,
            year,
            doi,
          });
          break;
        default:
          citationLatex = generateIEEECitation({
            authors,
            title,
            journal,
            volume,
            issue,
            pages,
            year,
            doi,
          });
      }
    }

    const timestamp = Date.now();
    const baseFileName = `citation_${timestamp}`;
    const texFileName = `${baseFileName}.tex`;
    const pdfFileName = `${baseFileName}.pdf`;
    const imgFileName = `${baseFileName}.png`;
    // const texFilePath = path.join(TEMP_DIR, texFileName);
    const texFilePath = path.join(jobDir, texFileName);
    const pdfFilePath = path.join(OUTPUT_DIR, pdfFileName);
    const imgFilePath = path.join(OUTPUT_DIR, imgFileName);

    const latexDocument = `\\documentclass[12pt]{article}
\\usepackage[letterpaper, margin=1in]{geometry}
\\usepackage{times}
\\usepackage{url}
\\usepackage{hyperref}
\\usepackage{parskip}
\\setlength{\\parindent}{-0.2in}
\\setlength{\\leftskip}{0.2in}
\\setlength{\\parskip}{6pt}
\\pagestyle{empty}
\\begin{document}
\\noindent
\\textbf{References}

\\vspace{10pt}

\\noindent
[${citationNumber || 1}] ${citationLatex}
\\end{document}`;

    await fs.writeFile(texFilePath, latexDocument, "utf8");
    console.log("📄 Citation LaTeX file written");

    // Delete old PDF if exists
    try {
      await fs.remove(pdfFilePath);
    } catch (e) {}

    // Run pdflatex
    console.log("🔄 Compiling citation...");
    const result = await runPdfLatexPermissive(texFilePath, OUTPUT_DIR);
    console.log(`📊 Compilation exit code: ${result.code}`);

    // Check if PDF exists
    const pdfExists = await fs.pathExists(pdfFilePath);
    console.log(`📄 PDF exists: ${pdfExists}`);

    if (!pdfExists) {
      const logPath = path.join(OUTPUT_DIR, `${baseFileName}.log`);
      let logContent = "";
      try {
        logContent = await fs.readFile(logPath, "utf8");
      } catch {}

      console.error("❌ Citation compilation failed - no PDF");
      throw new Error(`PDF not generated. Log:\n${logContent.slice(-500)}`);
    }

    console.log("✅ Citation PDF created");

    // Convert to image
    try {
      console.log("🖼️ Converting citation to image...");
      const rawImagePath = await convertPdfToImage(pdfFilePath, imgFilePath);
      const finalImagePath = path.join(OUTPUT_DIR, `final_${imgFileName}`);
      await sharp(rawImagePath).png({ quality: 100 }).toFile(finalImagePath);

      // Clean up auxiliary files from OUTPUT_DIR but keep the final result
      await cleanupFiles(baseFileName, OUTPUT_DIR);

      console.log("✅ Citation compilation complete\n");

      res.json({
        success: true,
        previewUrl: `/output/final_${imgFileName}`,
        latexCode: citationLatex,
        format: format,
        message: customLatex
          ? "Citation recompiled successfully"
          : "Citation generated successfully",
      });
    } catch (imageError) {
      console.error("❌ Image conversion failed:", imageError.message);
      res.status(500).json({
        error: "Image conversion failed",
        details: imageError.message,
      });
    }
  } catch (error) {
    console.error("❌ Citation compilation error:", error.message);
    res.status(500).json({
      error: `Citation compilation failed: ${error.message}`,
      details: error.stack,
    });
  }
});

// API: Save citation
app.post("/api/citation/save", async (req, res) => {
  console.log("💾 Received citation save request");
  try {
    const { fileName, citationData, latexCode, projectId } = req.body;

    if (!citationData || !latexCode) {
      return res
        .status(400)
        .json({ error: "citationData and latexCode are required" });
    }

    const rawName = fileName || citationData.title || `citation_${Date.now()}`;
    const sanitizedFileName = rawName
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 60);
    // Ensure unique filename by appending timestamp
    const uniqueFileName = `${sanitizedFileName}_${Date.now()}`;
    const fullFileName = `${uniqueFileName}.json`;

    const targetDir = projectId
      ? path.join(PROJECTS_DIR, String(projectId), "citations")
      : CITATIONS_DIR;
    await fs.ensureDir(targetDir);

    const filePath = path.join(targetDir, fullFileName);

    const existingFiles = await fs.readdir(targetDir);
    const jsonFiles = existingFiles.filter((f) => f.endsWith(".json"));
    const citationNumber = jsonFiles.length + 1;

    const citationRecord = {
      ...citationData,
      latexCode,
      citationNumber,
      createdAt: new Date().toISOString(),
      fileName: uniqueFileName,
    };

    await fs.writeFile(
      filePath,
      JSON.stringify(citationRecord, null, 2),
      "utf8",
    );

    res.json({
      success: true,
      fileName: uniqueFileName,
      citationNumber,
      message: "Citation saved successfully",
    });
  } catch (error) {
    console.error("❌ Citation save error:", error);
    res.status(500).json({ error: `Save failed: ${error.message}` });
  }
});

// API: List saved citations
app.get("/api/citation/list", async (req, res) => {
  console.log("📋 Received request to list citations");
  try {
    const { projectId } = req.query;
    const targetDir = projectId
      ? path.join(PROJECTS_DIR, String(projectId), "citations")
      : CITATIONS_DIR;
    await fs.ensureDir(targetDir);

    const files = await fs.readdir(targetDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    const citations = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(targetDir, file);
        const content = await fs.readFile(filePath, "utf8");
        const data = JSON.parse(content);
        return data;
      }),
    );

    citations.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(citations);
  } catch (error) {
    console.error("❌ List citations error:", error);
    res
      .status(500)
      .json({ error: `Failed to list citations: ${error.message}` });
  }
});

// API: Delete citation
app.delete("/api/citation/:filename", async (req, res) => {
  console.log("🗑️ Received request to delete citation:", req.params.filename);
  try {
    const { filename } = req.params;
    const { projectId } = req.query;
    const targetDir = projectId
      ? path.join(PROJECTS_DIR, String(projectId), "citations")
      : CITATIONS_DIR;
    const sanitizedFileName = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fullFileName = `${sanitizedFileName}.json`;
    const filePath = path.join(targetDir, fullFileName);

    await fs.unlink(filePath);

    res.json({
      success: true,
      message: "Citation deleted successfully",
      fileName: sanitizedFileName,
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "Citation file not found" });
    }

    res
      .status(500)
      .json({ error: `Failed to delete citation: ${error.message}` });
  }
});

// Create Draft Version
app.post("/api/drafts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, files } = req.body;
    console.log(name, description, files);
    const draftDir = path.join(PROJECTS_DIR, id);
    const draftPath = path.join(draftDir, "draft.json");
    const draftId = uuidv4();

    // Initialize draftData
    let draftData = {};

    // Check if draft.json exists and load it
    if (await fs.pathExists(draftPath)) {
      draftData = await fs.readJSON(draftPath);
    }

    draftData[draftId] = {
      name: name,
      timestamp: new Date().toISOString(),
      description: description,
      content: files,
    };

    // Save updated draft.json
    await fs.writeJSON(draftPath, draftData, { spaces: 2 });

    // Write each file to disk
    for (const [fileName, fileInfo] of Object.entries(files)) {
      const filePath = path.join(draftDir, fileName);
      await fs.writeFile(filePath, fileInfo.content, "utf8");
      console.log(`✅ Saved ${fileName} to disk`);
    }

    console.log("draftData", draftData);

    console.log(`✅ Saved draft: ${name} in (${id})`);
    res.json({ success: true, message: "Draft saved successfully", draftData });
  } catch (error) {
    console.error("❌ Draft save error:", error);
    res.status(500).json({ success: false, error: "Failed to save draft" });
  }
});

// Load Drafts from draft.json
app.get("/api/drafts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const draftPath = path.join(PROJECTS_DIR, id, "draft.json");

    if (!(await fs.pathExists(draftPath))) {
      return res.status(404).json({ success: false, error: "Draft not found" });
    }
    const draftData = await fs.readJSON(draftPath);

    console.log(`✅ Loaded Drafts of (${id})`);
    res.json({ success: true, draft: draftData });
  } catch (error) {
    console.error("❌ Draft load error:", error);
    res.status(500).json({ success: false, error: "Failed to load drafts" });
  }
});

// Save / Update Settings
app.patch("/api/settings", async (req, res) => {
  try {
    const { settings } = req.body;
    const settingsDir = path.join(SETTINGS_DIR, "config.json");

    // Load existing settings to compare and avoid overwriting keys with masks
    let existingSettings = {};
    if (await fs.pathExists(settingsDir)) {
      existingSettings = await fs.readJSON(settingsDir);
    }

    // Encrypt any AI API keys before saving
    if (settings.app && settings.app.aiConfigs) {
      settings.app.aiConfigs = settings.app.aiConfigs.map((config) => {
        if (config.provider === "gemini") {
          // If the frontend sends the mask, restore the existing encrypted key
          if (config.apiKey === "********") {
            const existingConfig = existingSettings.app?.aiConfigs?.find(
              (c) => c.id === config.id,
            );
            return {
              ...config,
              apiKey: existingConfig ? existingConfig.apiKey : "",
            };
          }
          // If it's a new or changed key (no ':' separator), encrypt it
          if (config.apiKey && !config.apiKey.includes(":")) {
            return { ...config, apiKey: encrypt(config.apiKey) };
          }
        }
        return config;
      });
    }

    // Save updated config.json
    await fs.writeJSON(settingsDir, settings, { spaces: 2 });

    console.log(`✅ Saved Setting`);
    res.json({
      success: true,
      message: "Settings saved successfully",
    });
  } catch (error) {
    console.error("❌ Setting save error:", error);
    res.status(500).json({ success: false, error: "Failed to save Setting" });
  }
});

// Load Settings from config.json
app.get("/api/settings", async (req, res) => {
  try {
    const settingsDir = path.join(SETTINGS_DIR, "config.json");

    if (!(await fs.pathExists(settingsDir))) {
      return res
        .status(404)
        .json({ success: false, error: "config.json not found" });
    }
    const settings = await fs.readJSON(settingsDir);

    // Mask AI API keys before sending to frontend
    // if (settings.app && settings.app.aiConfigs) {
    //   settings.configWithMaskedKeys = JSON.parse(JSON.stringify(settings)); // Clone
    //   settings.app.aiConfigs = settings.app.aiConfigs.map((config) => {
    //     if (config.provider === "gemini" && config.apiKey) {
    //       return { ...config, apiKey: "********" };
    //     }
    //     return config;
    //   });
    // }

    console.log(`✅ Loaded Settings`);
    res.json({ success: true, settings: settings });
  } catch (error) {
    console.error("❌ Settings load error:", error);
    res.status(500).json({ success: false, error: "Failed to load Settings" });
  }
});

// API: Get server status
app.get("/api/status", async (req, res) => {
  try {
    const testPdfLatex = () => {
      return new Promise((resolve) => {
        const test = spawn("pdflatex", ["--version"]);
        test.on("close", (code) => {
          resolve(code === 0);
        });
        test.on("error", () => {
          resolve(false);
        });
      });
    };

    const pdflatexAvailable = await testPdfLatex();

    const getDirectoryInfo = async (dir) => {
      try {
        const files = await fs.readdir(dir);
        return { exists: true, fileCount: files.length };
      } catch {
        return { exists: false, fileCount: 0 };
      }
    };

    const [projectsInfo, equationsInfo, citationsInfo, tempInfo, outputInfo] =
      await Promise.all([
        getDirectoryInfo(PROJECTS_DIR),
        getDirectoryInfo(EQUATIONS_DIR),
        getDirectoryInfo(CITATIONS_DIR),
        // getDirectoryInfo(TEMP_DIR),
        getDirectoryInfo(jobDir),
        getDirectoryInfo(OUTPUT_DIR),
      ]);

    res.json({
      status: "running",
      pdflatexAvailable,
      directories: {
        projects: projectsInfo,
        equations: equationsInfo,
        citations: citationsInfo,
        temp: tempInfo,
        output: outputInfo,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// Serve static files (PDFs and images)
app.use(
  "/output",
  express.static(OUTPUT_DIR, {
    setHeaders: (res, path) => {
      if (path.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Unified LaTeX Server - Projects, Math, Citations",
    version: "2.0.0",
    port: PORT,
    endpoints: {
      // Project routes
      "POST /api/projects/create": "Create new project",
      "GET /api/projects": "List all projects",
      "GET /api/projects/:id": "Load project",
      "PUT /api/projects/:id": "Save project",
      "DELETE /api/projects/:id": "Delete project",
      "POST /api/compile": "Compile project LaTeX",
      // Equation routes
      "POST /api/latex/compile": "Compile LaTeX equation",
      "POST /api/equations/save": "Save equation",
      "GET /api/equations/list": "List equations",
      "GET /api/equations/load/:filename": "Load equation",
      "DELETE /api/equations/:filename": "Delete equation",
      // Citation routes
      "POST /api/citation/compile": "Compile citation",
      "POST /api/citation/save": "Save citation",
      "GET /api/citation/list": "List citations",
      "DELETE /api/citation/:filename": "Delete citation",
      // Status routes
      "GET /api/health": "Health check",
      "GET /api/status": "Server status",
      "GET /output/:filename": "Serve generated files",
    },
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("🔥 Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path,
    method: req.method,
  });
});

// Start server
async function startServer() {
  try {
    await initDirectories();

    const server = app.listen(PORT, "127.0.0.1", () => {
      console.log("🚀 Unified LaTeX Server Started!");
      console.log("=".repeat(60));
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`📁 Projects: ${PROJECTS_DIR}`);
      console.log(`📁 Equations: ${EQUATIONS_DIR}`);
      console.log(`📁 Citations: ${CITATIONS_DIR}`);
      // console.log(`📁 Temp: ${TEMP_DIR}`);
      console.log(`📁 Temp: ${jobDir}`);
      console.log(`📁 Output: ${OUTPUT_DIR}`);
      console.log(
        `🔧 pdfLaTeX: ${PDFLATEX_PATH ? "✅ Ready" : "❌ Not found"}`,
      );
      console.log("=".repeat(60));
      console.log("✨ All routes from both servers merged successfully!");
      console.log("=".repeat(60));

      const pdflatexPath = getPdflatexPath();
      console.log("pdflatexPath = ", pdflatexPath);

      //To use pdflatex from Local device use the below code
      const testPdfLatex = spawn(
        projMode === "DEV" ? "pdflatex" : pdflatexPath,
        ["--version"],
      );

      //FIXME: The below code is useless, can be deleted
      //To use pdflatex from TinyTex use the below code
      // const testPdfLatex = spawn(pdflatexPath, ["--version"]);

      testPdfLatex.on("close", (code) => {
        if (code === 0) {
          console.log("✅ pdflatex is available and ready");
        } else {
          console.log("❌ WARNING: pdflatex not found or not working");
          console.log("   Please install TeX Live or MiKTeX");
        }
      });
      testPdfLatex.on("error", () => {
        console.log("❌ WARNING: pdflatex not found in PATH");
        console.log("   Please install TeX Live or MiKTeX and add to PATH");
      });
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `💥 CRITICAL ERROR: Port ${PORT} is already in use by another application!`,
        );
        console.error(
          `Please close the other application or restart your computer. Shutting down.`,
        );
        process.exit(1);
      } else {
        console.error("💥 Server error:", error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Gracefully shutting down server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Server terminated");
  process.exit(0);
});

export default app;
