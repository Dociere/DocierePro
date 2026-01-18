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

dotenv.config();

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
const PROJECTS_DIR = path.join(__dirname, "projects");
const TEMP_DIR = path.join(__dirname, "temp");
const OUTPUT_DIR = path.join(__dirname, "output");
const EQUATIONS_DIR = path.join(__dirname, "equations");
const CITATIONS_DIR = path.join(__dirname, "citations");

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
        "-file-line-error", // Better error format
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

// ==================== EQUATION GENERATION USING AI ROUTE ====================

app.post("/api/generate-equation", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: "Prompt is required" });
    }

    console.log(`🤖 Generating equation for prompt: "${prompt}"`);

    // Call Python AI Service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/generate-equation`, {
      prompt: prompt
    });

    if (aiResponse.data && aiResponse.data.success) {
      console.log("✅ AI Equation generated successfully");
      res.json({
        success: true,
        latexEquation: aiResponse.data.latexEquation
      });
    } else {
      throw new Error(aiResponse.data.error || "AI service failed");
    }

  } catch (error) {
    console.error("❌ AI Equation Generation Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate equation",
      details: error.message
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

// API: Create new project
app.post("/api/projects/create", async (req, res) => {
  try {
    const { title, authorDetails, generateBoilerplate, userIdea, Owner } =
      req.body;
    const projectId = uuidv4();
    const projectDir = path.join(PROJECTS_DIR, projectId);
    await fs.ensureDir(projectDir);

    let defaultContent;
    console.log("🆕 Creating new project:", title);

    if (generateBoilerplate && userIdea) {
      try {
        console.log("🤖 Generating LaTeX content via AI...");
        const aiResponse = await axios.post(
          `${AI_SERVICE_URL}/api/generate-latex`,
          {
            userIdea,
            title,
            templateType: req.body.templateType || "Blank Document",
            authorDetails,
          },
        );

        if (aiResponse.data.success) {
          defaultContent = aiResponse.data.latexContent;
          console.log("✅ AI-generated LaTeX content received");
        } else {
          throw new Error("AI generation failed");
        }
      } catch (aiError) {
        console.error("AI generation error:", aiError);
        defaultContent = getDefaultTemplate(title, authorDetails);
      }
    } else {
      defaultContent = getDefaultTemplate(title, authorDetails);
    }

    const projectData = {
      id: projectId,
      title: title || "Untitled Project",
      owner: Owner,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      files: {
        "main.tex": {
          name: "main.tex",
          content: defaultContent,
          type: "tex",
        },
      },
      activeFile: "main.tex",
    };

    await fs.writeJSON(path.join(projectDir, "project.json"), projectData, {
      spaces: 2,
    });
    await fs.writeFile(path.join(projectDir, "main.tex"), defaultContent);

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
        fileInfo.content = await fs.readFile(filePath, "utf8");
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
      const filePath = path.join(projectDir, fileName);
      await fs.writeFile(filePath, fileInfo.content, "utf8");
      console.log(`✅ Saved ${fileName} to disk`);
    }

    console.log(`✅ Saved project: ${projectData.title} (${id})`);
    res.json({ success: true, message: "Project saved successfully" });
  } catch (error) {
    console.error("❌ Project save error:", error);
    res.status(500).json({ success: false, error: "Failed to save project" });
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

// API: Compile LaTeX (for projects)
app.post("/api/compile", async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("📝 NEW COMPILATION REQUEST");
  console.log("=".repeat(60));

  if (!PDFLATEX_PATH) {
    return res.status(500).json({
      success: false,
      error: "pdfLaTeX not available",
      message: "Please install MiKTeX or TeX Live",
    });
  }

  const timestamp = Date.now();
  const filename = `compile_${timestamp}`;
  const texPath = path.join(TEMP_DIR, `${filename}.tex`);
  const pdfPath = path.join(OUTPUT_DIR, `${filename}.pdf`);
  const logPath = path.join(OUTPUT_DIR, `${filename}.log`);

  try {
    const { content, projectId } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: "No LaTeX content provided",
      });
    }

    console.log(`📄 Project ID: ${projectId || "none"}`);
    console.log(`📄 Content length: ${content.length} characters`);
    console.log(`📄 TEX file path: ${texPath}`);
    console.log(`📄 PDF target path: ${pdfPath}`);

    // Write the .tex file
    await fs.writeFile(texPath, content, "utf8");
    console.log(`✅ TEX file written successfully`);

    // Verify file was written
    const texExists = await fs.pathExists(texPath);
    console.log(`✅ TEX file exists: ${texExists}`);

    if (!texExists) {
      throw new Error("Failed to write TEX file to disk");
    }

    // Delete old PDF if it exists (prevents false positives)
    try {
      await fs.remove(pdfPath);
      console.log(`🗑️ Removed old PDF if it existed`);
    } catch (e) {
      // Ignore if file doesn't exist
    }

    // FIRST COMPILATION PASS
    console.log("\n🔄 STARTING FIRST PDFLATEX PASS...");
    const result1 = await runPdfLatexPermissive(texPath, OUTPUT_DIR);
    console.log(`📊 First pass exit code: ${result1.code}`);
    console.log(`📊 Stdout length: ${result1.stdout.length}`);
    console.log(`📊 Stderr length: ${result1.stderr.length}`);

    // Check if PDF was created after first pass
    let pdfExists = await fs.pathExists(pdfPath);
    console.log(`📄 PDF exists after first pass: ${pdfExists}`);

    if (pdfExists) {
      const stats = await fs.stat(pdfPath);
      console.log(`📄 PDF file size: ${stats.size} bytes`);
    }

    // SECOND COMPILATION PASS (for references, bibliographies, etc.)
    if (pdfExists) {
      console.log("\n🔄 STARTING SECOND PDFLATEX PASS...");
      const result2 = await runPdfLatexPermissive(texPath, OUTPUT_DIR);
      console.log(`📊 Second pass exit code: ${result2.code}`);

      // Check again after second pass
      pdfExists = await fs.pathExists(pdfPath);
      console.log(`📄 PDF exists after second pass: ${pdfExists}`);
    }

    // FINAL CHECK - Does PDF exist?
    pdfExists = await fs.pathExists(pdfPath);
    console.log(`\n📄 FINAL CHECK - PDF exists: ${pdfExists}`);

    if (pdfExists) {
      // SUCCESS! PDF was generated
      const pdfBuffer = await fs.readFile(pdfPath);
      console.log(`✅ SUCCESS! PDF size: ${pdfBuffer.length} bytes`);

      // Try to read log file for errors/warnings
      let logContent = "";
      let errors = [];
      let warnings = [];

      try {
        logContent = await fs.readFile(logPath, "utf8");

        // Extract error lines
        const lines = logContent.split("\n");
        errors = lines
          .filter(
            (line) => line.trim().startsWith("!") && !line.includes("****"),
          )
          .slice(0, 20);

        // Extract warning lines
        warnings = lines
          .filter((line) => line.toLowerCase().includes("warning"))
          .slice(0, 20);

        console.log(
          `📊 Extracted ${errors.length} errors and ${warnings.length} warnings from log`,
        );
      } catch (logError) {
        console.log(`⚠️ Could not read log file: ${logError.message}`);
      }

      console.log("=".repeat(60));
      console.log("✅ COMPILATION SUCCESSFUL - SENDING PDF TO CLIENT");
      console.log("=".repeat(60) + "\n");

      // Return success response
      res.json({
        success: true,
        pdf: pdfBuffer.toString("base64"),
        message:
          errors.length > 0
            ? `Compiled successfully despite ${errors.length} error(s)`
            : warnings.length > 0
              ? `Compiled with ${warnings.length} warning(s)`
              : "Document compiled successfully",
        log: logContent || result1.stdout,
        errors: errors.length > 0 ? errors : null,
        warnings: warnings.length > 0 ? warnings : null,
        hasErrors: errors.length > 0,
        hasWarnings: warnings.length > 0,
      });
    } else {
      // FAILURE - No PDF was generated
      console.error("\n❌ COMPILATION FAILED - NO PDF GENERATED");

      let logContent = "";
      let errorDetails = [];

      try {
        logContent = await fs.readFile(logPath, "utf8");
        console.log(`📄 Log file size: ${logContent.length} characters`);

        // Extract critical error information
        const lines = logContent.split("\n");
        let errorContext = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes("!") || line.toLowerCase().includes("error")) {
            // Collect context around error
            const start = Math.max(0, i - 2);
            const end = Math.min(lines.length, i + 5);
            errorContext.push(lines.slice(start, end).join("\n"));
          }
        }

        errorDetails = errorContext.slice(0, 5); // First 5 errors with context
        console.log(`📊 Extracted ${errorDetails.length} error contexts`);

        if (errorDetails.length > 0) {
          console.log("\n❌ ERROR DETAILS:");
          errorDetails.forEach((err, idx) => {
            console.log(`\nError ${idx + 1}:\n${err}`);
          });
        }
      } catch (logError) {
        console.log(`⚠️ Could not read log file: ${logError.message}`);
      }

      // List files in output directory for debugging
      try {
        const outputFiles = await fs.readdir(OUTPUT_DIR);
        const relevantFiles = outputFiles.filter((f) => f.includes(filename));
        console.log(
          `📁 Files in output directory for this compilation:`,
          relevantFiles,
        );
      } catch (e) {
        console.log(`⚠️ Could not list output directory`);
      }

      console.log("=".repeat(60));
      console.log("❌ COMPILATION FAILED - SENDING ERROR TO CLIENT");
      console.log("=".repeat(60) + "\n");

      res.json({
        success: false,
        error: "LaTeX compilation failed - no PDF was generated",
        details:
          errorDetails.length > 0
            ? errorDetails.join("\n\n--- Next Error ---\n\n")
            : "No specific errors found in log. This might be a critical syntax error.",
        log: logContent || result1.stdout,
        message:
          "Critical error prevented PDF generation. Check the error details and log.",
        fullStdout: result1.stdout.slice(-2000), // Last 2000 chars of stdout
        fullStderr: result1.stderr.slice(-2000), // Last 2000 chars of stderr
      });
    }

    // Schedule cleanup after 30 seconds
    setTimeout(() => {
      cleanupFiles(filename, TEMP_DIR);
      cleanupFiles(filename, OUTPUT_DIR);
      console.log(`🧹 Cleaned up files for ${filename}`);
    }, 30000);
  } catch (error) {
    console.error("\n❌ EXCEPTION DURING COMPILATION:");
    console.error(error);
    console.log("=".repeat(60) + "\n");

    res.status(500).json({
      success: false,
      error: "Compilation exception",
      details: error.message,
      stack: error.stack,
    });
  }
});

// ==================== LATEX MATH EQUATION ROUTES ====================

// API: Compile LaTeX (for math equations)
app.post("/api/latex/compile", async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("📐 EQUATION COMPILATION REQUEST");
  console.log("=".repeat(60));

  try {
    const {
      latex,
      isTemp = true,
      fileName = "temp",
      format = "pdf",
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

    const minimalLatexDocument = `\\documentclass[border=2pt,varwidth=true]{standalone}
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

    await fs.writeFile(texFilePath, minimalLatexDocument, "utf8");
    console.log("📄 LaTeX equation file written:", texFileName);

    // Delete old PDF if exists
    try {
      await fs.remove(pdfFilePath);
    } catch (e) {}

    // Run pdflatex
    console.log("🔄 Compiling equation...");
    const result = await runPdfLatexPermissive(texFilePath, OUTPUT_DIR);
    console.log(`📊 Compilation exit code: ${result.code}`);

    // Check if PDF was generated
    const pdfExists = await fs.pathExists(pdfFilePath);
    console.log(`📄 PDF exists: ${pdfExists}`);

    if (!pdfExists) {
      const logPath = path.join(OUTPUT_DIR, `${baseFileName}.log`);
      let logContent = "";
      try {
        logContent = await fs.readFile(logPath, "utf8");
      } catch {}

      console.error("❌ Equation compilation failed - no PDF");
      throw new Error(
        `PDF was not generated. Check LaTeX syntax. Last 500 chars of log:\n${logContent.slice(
          -500,
        )}`,
      );
    }

    console.log("✅ Equation PDF created successfully");

    let finalUrl = `/output/${pdfFileName}`;
    let finalFileName = pdfFileName;

    // Convert to image if requested
    if (format === "image" || format === "png") {
      try {
        console.log("🖼️ Converting to image...");
        const rawImagePath = await convertPdfToImage(pdfFilePath, imgFilePath);
        const croppedImagePath = path.join(
          OUTPUT_DIR,
          `cropped_${imgFileName}`,
        );
        console.log("✂️ Cropping to content...");
        await cropImageToContent(rawImagePath, croppedImagePath);
        finalUrl = `/output/cropped_${imgFileName}`;
        finalFileName = `cropped_${imgFileName}`;
        console.log("✅ Image created successfully");
      } catch (imageError) {
        console.error(
          "⚠️ Image conversion failed, using PDF:",
          imageError.message,
        );
      }
    }

    await cleanupFiles(baseFileName, OUTPUT_DIR);

    console.log("✅ Equation compilation complete\n");

    res.json({
      success: true,
      pdfUrl: finalUrl,
      fileName: finalFileName,
      message: "LaTeX compiled successfully",
      format: finalUrl.endsWith(".png") ? "image" : "pdf",
    });
  } catch (error) {
    console.error("❌ Equation compilation error:", error.message);
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

    if (!fileName || !citationData || !latexCode) {
      return res
        .status(400)
        .json({ error: "fileName, citationData, and latexCode are required" });
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fullFileName = `${sanitizedFileName}.json`;
    const filePath = path.join(CITATIONS_DIR, fullFileName);

    const citationRecord = {
      ...citationData,
      latexCode,
      createdAt: new Date().toISOString(),
      fileName: sanitizedFileName,
    };

    await fs.writeFile(
      filePath,
      JSON.stringify(citationRecord, null, 2),
      "utf8",
    );

    res.json({
      success: true,
      fileName: sanitizedFileName,
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

    citations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
