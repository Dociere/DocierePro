import express from "express";
import cors from "cors";
import fs from "fs-extra";
import path from "path";
import { exec, spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import axios from "axios";
import dotenv from "dotenv";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname } from "path";
import * as TemplateEngine from "./renderStrategies.js";
import util from "util";
dotenv.config();

const execAsync = util.promisify(exec);
const app = express();
const PORT = process.env.PORT || 5000;
const AI_SERVICE_URL = "http://localhost:5025";

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Directories
const SETTINGS_DIR = path.join(__dirname);
const PROJECTS_DIR = path.join(__dirname, "projects");
const TEMP_DIR = path.join(__dirname, "temp");
const OUTPUT_DIR = path.join(__dirname, "output");
const EQUATIONS_DIR = path.join(__dirname, "equations");
const CITATIONS_DIR = path.join(__dirname, "citations");
const TEMPLATES_DIR = path.join(__dirname, "templates");

// STEP 1: Add this helper function at the top of your file (after imports)
// This replaces the existing runPdfLatex if you have one
function runPdfLatexPermissive(texFilePath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`🔧 Running pdflatex on: ${texFilePath}`);
    console.log(`🔧 Output directory: ${outputPath}`);

    const pdflatex = spawn(
      "pdflatex",
      [
        `-output-directory=${outputPath}`,
        "-interaction=nonstopmode", // Never stop for errors
        "-file-line-error",
        "-synctex=1", // Better error format
        texFilePath,
      ],
      {
        cwd: path.dirname(texFilePath),
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

// Helper function for default template
function getDefaultTemplate(title, authorDetails) {
  return `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\title{${title || "New Document"}}
\\author{${authorDetails?.name || "Author Name"}}
\\date{\\today}
\\begin{document}
\\maketitle
\\section{Introduction}
Welcome to your new LaTeX document! Start writing your content here.
\\end{document}`;
}

// Initialize directories
async function initDirectories() {
  await fs.ensureDir(PROJECTS_DIR);
  await fs.ensureDir(TEMP_DIR);
  await fs.ensureDir(OUTPUT_DIR);
  await fs.ensureDir(EQUATIONS_DIR);
  await fs.ensureDir(CITATIONS_DIR);
  console.log("✅ Directories initialized");
}

// Auto-detect LaTeX installation
const detectLaTeX = () => {
  const possiblePaths = [
    "C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe",
    "C:\\Users\\jerde\\AppData\\Local\\Programs\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe",
    "C:\\Program Files (x86)\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe",
    path.join(
      process.env.USERPROFILE || "",
      "AppData\\Local\\Programs\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe",
    ),
    "/usr/bin/pdflatex",
    "/usr/local/bin/pdflatex",
    "pdflatex",
  ];

  for (const pdflatexPath of possiblePaths) {
    try {
      if (fs.existsSync(pdflatexPath) || pdflatexPath === "pdflatex") {
        console.log(`✅ Found pdfLaTeX at: ${pdflatexPath}`);
        return pdflatexPath;
      }
    } catch (error) {
      continue;
    }
  }
  throw new Error("❌ pdfLaTeX not found! Please install MiKTeX or TeX Live");
};

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
    "pdf",
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
      // Ignore cleanup errors
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
    const { width, height } = await image.metadata();
    const buffer = await image.raw().toBuffer();
    const bounds = await findContentBounds(buffer, width, height);

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

async function findContentBounds(buffer, width, height) {
  const channels = 3;
  let minX = width,
    maxX = 0,
    minY = height,
    maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * channels;
      const r = buffer[index];
      const g = buffer[index + 1];
      const b = buffer[index + 2];

      if (r < 250 || g < 250 || b < 250) {
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
    const { prompt, latexContent, context, fileMap } = req.body;

    if (!prompt || !latexContent) {
      return res
        .status(400)
        .json({ error: "Prompt and LaTeX content required" });
    }

    console.log(
      `🤖 Editing LaTeX with AI prompt: "${prompt.substring(0, 50)}..."`,
    );

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/edit-latex`, {
      prompt,
      latexContent,
      context,
      fileMap,
    });

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

// ==================== EQUATION GENERATION USING AI ROUTE ====================

app.post("/api/generate-equation", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res
        .status(400)
        .json({ success: false, error: "Prompt is required" });
    }

    console.log(`🤖 Generating equation for prompt: "${prompt}"`);

    // Call Python AI Service
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/api/generate-equation`,
      {
        prompt: prompt,
      },
    );

    if (aiResponse.data && aiResponse.data.success) {
      console.log("✅ AI Equation generated successfully");
      res.json({
        success: true,
        latexEquation: aiResponse.data.latexEquation,
      });
    } else {
      throw new Error(aiResponse.data.error || "AI service failed");
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
      const relPath = relativePath
        ? path.join(relativePath, entry.name)
        : entry.name;

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
    const entries = await fs.readdir(TEMPLATES_DIR, { withFileTypes: true });
    const templates = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    res.json({ success: true, templates });
  } catch (error) {
    console.error("❌ Template list error:", error);
    res.status(500).json({ success: false, error: "Failed to list templates" });
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

    const templateDir = path.join(TEMPLATES_DIR, name.trim());

    if (await fs.pathExists(templateDir)) {
      return res
        .status(409)
        .json({ success: false, error: "A template with this name already exists" });
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
    res
      .status(500)
      .json({ success: false, error: "Failed to save template" });
  }
});

// API: Create new project
app.post("/api/projects/create", async (req, res) => {
  try {
    const { title, generateBoilerplate, userIdea, Owner } = req.body;
    const projectId = uuidv4();
    const projectDir = path.join(PROJECTS_DIR, projectId);
    await fs.ensureDir(projectDir);

    console.log("🆕 Creating new project:", title);

    const templateType = req.body.templateType || "article";
    const templateSource = req.body.templateSource || "local";
    const projectPath = path.join(PROJECTS_DIR, projectId);

    console.log("🆕 Project details:", templateType, templateSource);
    // Initialize files object
    let files = {};
    let mainContent = "";

    // 1. Handle "Blank Document" logic
    if (templateType === "Blank Document" || templateType === "blank") {
      mainContent = `\\documentclass{article}
\\usepackage{graphicx} % Required for inserting images
\\title{${title}}
\\author{Author Name}
\\date{\\today}
\\begin{document}
\\maketitle
\\section{Introduction}

\\end{document}`;

      if (generateBoilerplate && userIdea) {
        try {
          console.log("🤖 Generating boilerplate for blank document...");
          const aiResponse = await axios.post(
            `${AI_SERVICE_URL}/api/generate-latex`,
            {
              userIdea,
              title,
              templateType: "Blank Document",
            },
          );

          if (aiResponse.data.success && aiResponse.data.latexContent) {
            mainContent = aiResponse.data.latexContent;
            console.log("✅ AI-generated blank document content received");
          }
        } catch (error) {
          console.error("AI Generation failed for blank doc:", error.message);
          // Fallback to default content
        }
      }

      files["main.tex"] = {
        name: "main.tex",
        content: mainContent,
        type: "tex",
      };
    }
    // 2. Handle Local Templates (Multifile)
    else if (templateSource === "local") {
      const keyToFolder = {
        ieee_conference: "IEEE Conference",
        ieee_journal: "IEEE Journal",
        acm_manuscript: "ACM Manuscript",
        mla_format: "MLA Format",
        resume: "Resume",
        blank: "Blank Document",
      };

      console.log(keyToFolder);

      const folderName = keyToFolder[templateType] || templateType;
      const templatePath = path.join(TEMPLATES_DIR, folderName);

      console.log(`📂 Reading template from: ${templatePath}`);
      files = await getTemplateFiles(templatePath);

      if (Object.keys(files).length === 0) {
        throw new Error(`Template not found or empty: ${folderName}`);
      }

      // Set title from user input
      if (files["title.tex"]) {
        files["title.tex"].content = title;
      }

      // Generate boilerplate content for all template files
      if (generateBoilerplate && userIdea) {
        try {
          console.log("🤖 Generating boilerplate for multifile template...");

          // Build templateFiles map (just the file keys the AI should generate for)
          const templateFileKeys = Object.keys(files).filter((k) => {
            // Skip non-content files
            if (k.endsWith(".gitkeep")) return false;
            if (k === "main.tex") return false;
            if (k === "title.tex") return false; // Already set from user input
            if (/\.(cls|sty|pdf|png|jpg|jpeg|gif|svg|eps)$/i.test(k))
              return false;
            return true;
          });

          if (templateFileKeys.length > 0) {
            const aiResponse = await axios.post(
              `${AI_SERVICE_URL}/api/generate-boilerplate`,
              {
                title,
                userIdea,
                templateFiles: templateFileKeys,
              },
            );

            if (aiResponse.data.success && aiResponse.data.fileContents) {
              const generatedContent = aiResponse.data.fileContents;
              let populated = 0;

              for (const [fileKey, content] of Object.entries(
                generatedContent,
              )) {
                if (files[fileKey] && typeof content === "string") {
                  files[fileKey].content = content;
                  populated++;
                }
              }

              console.log(
                `✅ AI populated ${populated}/${templateFileKeys.length} template files`,
              );
            } else {
              console.error("⚠️ AI boilerplate generation returned no content");
            }
          }
        } catch (error) {
          console.error("❌ AI Generation failed for template:", error.message);
          // Fallback: template files stay with their default content
        }
      }
    }
    // 3. Handle Server Templates (Placeholder)
    else {
      // Fallback or implementation for server templates
      // For now treat as blank logic or error
      console.warn(
        `Server templates not yet implemented locally: ${templateType}`,
      );
      files["main.tex"] = {
        name: "main.tex",
        content: "% Server template placeholder",
        type: "tex",
      };
    }

    // Create project directory
    await fs.ensureDir(projectPath);

    // Save all files
    for (const [relPath, fileData] of Object.entries(files)) {
      const filePath = path.join(projectPath, relPath);
      await fs.ensureDir(path.dirname(filePath));

      if (fileData.isImage) {
        // write fileData.content (base64) back to file?
        // content is "data:image/png;base64,..."
        const base64Data = fileData.content.split(";base64,").pop();
        await fs.writeFile(filePath, base64Data, { encoding: "base64" });
      } else {
        await fs.writeFile(filePath, fileData.content);
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
    const { files, owner, activeFile, title } = req.body;
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

// API: Delete project
app.delete("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const projectDir = path.join(PROJECTS_DIR, id);

    if (!(await fs.pathExists(projectDir))) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });
    }

    await fs.remove(projectDir);
    console.log(`✅ Deleted project: ${id}`);
    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("❌ Project deletion error:", error);
    res.status(500).json({ success: false, error: "Failed to delete project" });
  }
});

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
// server.js

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
    const { content, projectId, files } = req.body;

    if (!content) {
      return res
        .status(400)
        .json({ success: false, error: "No LaTeX content" });
    }

    const filename = projectId ? projectId : `temp_project_${Date.now()}`;

    console.log(`Project ID: ${projectId}`);
    console.log(`Target Filename: ${filename}`);

    // Write all project files to TEMP_DIR, preserving directory structure
    let mainTexFile = "main.tex"; // Default to main.tex
    for (const [relPath, file] of Object.entries(files)) {
      // Skip .gitkeep files
      if (file.name === ".gitkeep" || relPath.endsWith("/.gitkeep")) continue;

      // Use the relative path key (e.g. "sections/introduction.tex") not just file.name
      const filePath = path.join(TEMP_DIR, relPath);
      // Ensure subdirectory exists
      await fs.ensureDir(path.dirname(filePath));

      console.log("Writing file:", relPath);

      // Check if file is a base64 image (data URL format)
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

      // Track which file is the main tex file
      if (relPath === "main.tex" || file.name === "main.tex") {
        mainTexFile = relPath;
      }
    }

    // Copy Definitions/ folder contents to TEMP_DIR root so pdflatex can find .cls/.sty files
    // (e.g. IEEEtran.cls lives in Definitions/ but \documentclass{IEEEtran} looks in the working dir)
    const defFiles = Object.entries(files).filter(
      ([k]) => k.startsWith("Definitions/") && !k.endsWith("/.gitkeep"),
    );
    for (const [relPath, file] of defFiles) {
      const destPath = path.join(TEMP_DIR, file.name); // copy flat to root
      if (file.isImage && file.content && file.content.startsWith("data:")) {
        const base64Match = file.content.match(/^data:[^;]+;base64,(.+)$/);
        if (base64Match)
          await fs.writeFile(destPath, Buffer.from(base64Match[1], "base64"));
      } else if (file.content) {
        await fs.writeFile(destPath, file.content, "utf8");
      }
    }

    const texPath = path.join(TEMP_DIR, mainTexFile);
    const pdfPath = path.join(OUTPUT_DIR, `${filename}.pdf`);
    const logPath = path.join(OUTPUT_DIR, `${filename}.log`);

    // Remove old PDF/SyncTeX to ensure fresh compile
    try {
      await fs.remove(pdfPath);
      await fs.remove(path.join(OUTPUT_DIR, `${filename}.synctex.gz`));
    } catch (e) {}

    console.log("🔄 Running PDFLaTeX...");
    const result1 = await runPdfLatexPermissive(texPath, OUTPUT_DIR);

    // PDFLaTeX outputs based on input filename (main.tex -> main.pdf)
    const mainTexBaseName = path.basename(mainTexFile, ".tex");
    const generatedPdfPath = path.join(OUTPUT_DIR, `${mainTexBaseName}.pdf`);
    const generatedSynctexPath = path.join(
      OUTPUT_DIR,
      `${mainTexBaseName}.synctex.gz`,
    );

    // Check if pdflatex generated the PDF (with main.tex's name)
    let pdfExists = await fs.pathExists(generatedPdfPath);

    // Run BibTeX if any .bib files exist (needed for \bibliography{})
    const hasBibFiles = Object.keys(files).some((k) => k.endsWith(".bib"));
    if (pdfExists && hasBibFiles) {
      try {
        // Copy .bib and .bst files to OUTPUT_DIR so bibtex can find them alongside .aux
        for (const [relPath, file] of Object.entries(files)) {
          if (relPath.endsWith(".bib") || relPath.endsWith(".bst")) {
            const destPath = path.join(OUTPUT_DIR, path.basename(relPath));
            await fs.writeFile(destPath, file.content || "", "utf8");
          }
        }
        // Also copy .bst files from Definitions/ that were flattened to TEMP_DIR root
        for (const [relPath, file] of defFiles) {
          if (file.name.endsWith(".bst") && file.content) {
            await fs.writeFile(
              path.join(OUTPUT_DIR, file.name),
              file.content,
              "utf8",
            );
          }
        }

        console.log("📚 Running BibTeX...");
        await new Promise((resolve) => {
          require("child_process").execFile(
            "bibtex",
            [mainTexBaseName],
            { cwd: OUTPUT_DIR, timeout: 30000 },
            (error, stdout, stderr) => {
              if (error) {
                console.warn(
                  "⚠️ BibTeX warning/error:",
                  stderr || error.message,
                );
              }
              resolve(); // Don't reject — bibtex warnings are common
            },
          );
        });
      } catch (bibErr) {
        console.warn("⚠️ BibTeX skipped:", bibErr.message);
      }
    }

    // Second pass (resolves references, citations)
    if (pdfExists) {
      await runPdfLatexPermissive(texPath, OUTPUT_DIR);
      // Third pass for cross-references if bibtex was run
      if (hasBibFiles) {
        await runPdfLatexPermissive(texPath, OUTPUT_DIR);
      }
    }

    pdfExists = await fs.pathExists(generatedPdfPath);

    if (pdfExists) {
      // Rename generated PDF to the expected projectId-based name if different
      if (generatedPdfPath !== pdfPath) {
        await fs.move(generatedPdfPath, pdfPath, { overwrite: true });

        // Also rename synctex file if it exists
        if (await fs.pathExists(generatedSynctexPath)) {
          const targetSynctexPath = path.join(
            OUTPUT_DIR,
            `${filename}.synctex.gz`,
          );
          await fs.move(generatedSynctexPath, targetSynctexPath, {
            overwrite: true,
          });
        }
      }

      const pdfBuffer = await fs.readFile(pdfPath);
      console.log(`✅ PDF Generated: ${filename}.pdf`);

      res.json({
        success: true,
        pdf: pdfBuffer.toString("base64"),
        fileName: `${filename}.pdf`,
        message: "Compiled successfully",
        log: result1.stdout,
      });
    } else {
      res.json({
        success: false,
        error: "Compilation failed",
        log: result1.stdout,
      });
    }

    // Only clean the TEMP .tex file, KEEP the .pdf and .synctex.gz
    setTimeout(() => {
      cleanupFiles(filename, TEMP_DIR);
    }, 60000);
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

    const testFile = path.join(TEMP_DIR, "test.tex");
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
  try {
    const {
      latex,
      preamble,
      isTemp = true,
      fileName = "temp",
      format = "pdf",
      type = "equation", // Default to 'equation', but can be 'section'
    } = req.body;

    if (!latex) {
      return res.status(400).json({ error: "LaTeX code is required" });
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const baseFileName = isTemp ? "temp" : sanitizedFileName;
    const texFileName = `${baseFileName}.tex`;
    const pdfFileName = `${baseFileName}.pdf`;
    const imgFileName = `${baseFileName}.png`;
    const texFilePath = path.join(TEMP_DIR, texFileName);
    const pdfFilePath = path.join(OUTPUT_DIR, pdfFileName);
    const imgFilePath = path.join(OUTPUT_DIR, imgFileName);

    let minimalLatexDocument = "";

    if (preamble) {
      // ✅ OPTION A: Use the User's Real Preamble
      // We assume the preamble includes \documentclass ... \begin{document}
      // We just append the section content and the closing tag.
      minimalLatexDocument = `${preamble}\n${latex}\n\\end{document}`;
      console.log(minimalLatexDocument);
    } else if (type === "table") {
      // 📊 OPTION for TABLE preview
      minimalLatexDocument = `\\documentclass[preview,border=12pt,varwidth=15cm]{standalone}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{multirow}
\\usepackage{xcolor}
\\usepackage{caption}
\\begin{document}
${latex}
\\end{document}`;
    } else if (type === "figure") {
      // 🖼️ OPTION for FIGURE preview
      minimalLatexDocument = `\\documentclass[preview,border=12pt,varwidth=15cm]{standalone}
\\usepackage{graphicx}
\\usepackage{caption}
\\begin{document}
${latex}
\\end{document}`;
    } else if (type === "section") {
      // ⚠️ OPTION B: Fallback Section Template (if no preamble found)
      minimalLatexDocument = `\\documentclass[preview,border=12pt,varwidth=15cm]{standalone}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\begin{document}
${latex}
\\end{document}`;
    } else {
      // ➗ OPTION C: Equation Mode
      minimalLatexDocument = `\\documentclass[border=2pt,varwidth=true]{standalone}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{mathtools}
\\usepackage{xcolor}
\\begin{document}
\\begin{displaymath}
${latex.replace(/[‹›]/g, "")}
\\end{displaymath}
\\end{document}`;
    }

    await fs.writeFile(texFilePath, minimalLatexDocument, "utf8");
    console.log("📄 Writing LaTeX file:", texFileName);

    // Run the permissive compiler
    await runPdfLatexPermissive(texFilePath, OUTPUT_DIR);

    // ... (The rest of the function remains the same: verification, image conversion, cleanup) ...

    // Verify PDF exists
    const pdfExists = await fs.pathExists(pdfFilePath);
    if (!pdfExists) {
      // ... existing error handling ...
      const logPath = path.join(OUTPUT_DIR, `${baseFileName}.log`);
      let logContent = "";
      try {
        logContent = await fs.readFile(logPath, "utf8");
      } catch (logErr) {}

      throw new Error(`PDF compilation failed. Log: ${logContent.slice(-500)}`);
    }

    let finalUrl = `/output/${pdfFileName}`;
    let finalFileName = pdfFileName;

    if (format === "image" || format === "png") {
      try {
        console.log("🖼️ Converting PDF to image...");
        const rawImagePath = await convertPdfToImage(pdfFilePath, imgFilePath);
        // Crop logic...
        const croppedImagePath = path.join(
          OUTPUT_DIR,
          `cropped_${imgFileName}`,
        );
        await cropImageToContent(rawImagePath, croppedImagePath);
        finalUrl = `/output/cropped_${imgFileName}`;
        finalFileName = `cropped_${imgFileName}`;
      } catch (imageError) {
        console.error("⚠️ Image conversion failed:", imageError.message);
      }
    }

    await cleanupFiles(baseFileName, OUTPUT_DIR);

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
  }
});

// API: Save equation
app.post("/api/equations/save", async (req, res) => {
  console.log("💾 Received equation save request");
  try {
    const { fileName, latex } = req.body;
    if (!fileName || !latex) {
      return res.status(400).json({ error: "fileName and latex are required" });
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fullFileName = `${sanitizedFileName}.tex`;
    const filePath = path.join(EQUATIONS_DIR, fullFileName);

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
    const files = await fs.readdir(EQUATIONS_DIR);
    const texFiles = files.filter((file) => file.endsWith(".tex"));
    console.log(`📚 Found ${texFiles.length} equation files`);

    const equations = await Promise.all(
      texFiles.map(async (file) => {
        const filePath = path.join(EQUATIONS_DIR, file);
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
    const sanitizedFileName = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fullFileName = `${sanitizedFileName}.tex`;
    const filePath = path.join(EQUATIONS_DIR, fullFileName);

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
    const sanitizedFileName = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fullFileName = `${sanitizedFileName}.tex`;
    const filePath = path.join(EQUATIONS_DIR, fullFileName);

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
    const texFilePath = path.join(TEMP_DIR, texFileName);
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
    const { fileName, citationData, latexCode } = req.body;

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
    const filePath = path.join(CITATIONS_DIR, fullFileName);

    const existingFiles = await fs.readdir(CITATIONS_DIR);
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
    const files = await fs.readdir(CITATIONS_DIR);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    const citations = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(CITATIONS_DIR, file);
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
    const sanitizedFileName = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fullFileName = `${sanitizedFileName}.json`;
    const filePath = path.join(CITATIONS_DIR, fullFileName);

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
    console.log("settings", settings);
    const settingsDir = path.join(SETTINGS_DIR, "config.json");

    // Save updated draft.json
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
        getDirectoryInfo(TEMP_DIR),
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

    app.listen(PORT, () => {
      console.log("🚀 Unified LaTeX Server Started!");
      console.log("=".repeat(60));
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`📁 Projects: ${PROJECTS_DIR}`);
      console.log(`📁 Equations: ${EQUATIONS_DIR}`);
      console.log(`📁 Citations: ${CITATIONS_DIR}`);
      console.log(`📁 Temp: ${TEMP_DIR}`);
      console.log(`📁 Output: ${OUTPUT_DIR}`);
      console.log(
        `🔧 pdfLaTeX: ${PDFLATEX_PATH ? "✅ Ready" : "❌ Not found"}`,
      );
      console.log("=".repeat(60));
      console.log("✨ All routes from both servers merged successfully!");
      console.log("=".repeat(60));

      const testPdfLatex = spawn("pdflatex", ["--version"]);
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
