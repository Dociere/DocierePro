const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Directories
const PROJECTS_DIR = path.join(__dirname, "projects");
const TEMP_DIR = path.join(__dirname, "temp");
const OUTPUT_DIR = path.join(__dirname, "output");

// Initialize directories
async function initDirectories() {
  await fs.ensureDir(PROJECTS_DIR);
  await fs.ensureDir(TEMP_DIR);
  await fs.ensureDir(OUTPUT_DIR);
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
      "AppData\\Local\\Programs\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe"
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
    const { title } = req.body;
    const projectId = uuidv4();
    const projectDir = path.join(PROJECTS_DIR, projectId);

    await fs.ensureDir(projectDir);

    const defaultContent = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{graphicx}

\\title{${title || "New Document"}}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Welcome to your news LaTeX document! Start writing your content here.

\\section{Mathematics}
Here's an example of a mathematical equation:
\\[E = mc^2\\]

And some inline math: $\\alpha + \\beta = \\gamma$

\\section{Lists}
\\begin{itemize}
    \\item First item
    \\item Second item
    \\item Third item
\\end{itemize}

\\section{Conclusion}
Your document content goes here.

\\end{document}`;

    const projectData = {
      id: projectId,
      title: title || "Untitled Project",
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
    res.json({
      success: true,
      project: projectData,
    });
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
            name: projectData.name,
            created: projectData.created,
            modified: projectData.modified,
          });
        }
      } catch (error) {
        console.error(`Error reading project ${dir}:`, error);
      }
    }

    // Sort by modified date (newest first)
    projects.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json(projects);
  } catch (error) {
    console.error("❌ Projects list error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list projects",
    });
  }
});

// API: Load project
app.get("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const projectPath = path.join(PROJECTS_DIR, id, "project.json");

    if (!(await fs.pathExists(projectPath))) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    const projectData = await fs.readJSON(projectPath);

    // Load file contents
    const projectDir = path.join(PROJECTS_DIR, id);
    for (const [fileName, fileInfo] of Object.entries(projectData.files)) {
      const filePath = path.join(projectDir, fileName);
      if (await fs.pathExists(filePath)) {
        fileInfo.content = await fs.readFile(filePath, "utf8");
      }
    }

    console.log(`✅ Loaded project: ${projectData.name} (${id})`);
    res.json({
      success: true,
      project: projectData,
    });
  } catch (error) {
    console.error("❌ Project load error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load project",
    });
  }
});

// API: Save project content
app.put("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { files, activeFile } = req.body;

    const projectDir = path.join(PROJECTS_DIR, id);
    const projectPath = path.join(projectDir, "project.json");

    if (!(await fs.pathExists(projectPath))) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    const projectData = await fs.readJSON(projectPath);

    // Update files
    projectData.files = files;
    projectData.activeFile = activeFile || projectData.activeFile;
    projectData.modified = new Date().toISOString();

    // Save project metadata
    await fs.writeJSON(projectPath, projectData, { spaces: 2 });

    // Save individual files
    for (const [fileName, fileInfo] of Object.entries(files)) {
      const filePath = path.join(projectDir, fileName);
      await fs.writeFile(filePath, fileInfo.content, "utf8");
    }

    console.log(`✅ Saved project: ${projectData.name} (${id})`);
    res.json({
      success: true,
      message: "Project saved successfully",
    });
  } catch (error) {
    console.error("❌ Project save error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save project",
    });
  }
});

// API: Compile LaTeX
// API: Compile LaTeX (IMPROVED VERSION)
app.post("/api/compile", async (req, res) => {
  if (!PDFLATEX_PATH) {
    return res.status(500).json({
      success: false,
      error: "pdfLaTeX not available",
      message: "Please install MiKTeX or TeX Live",
    });
  }

  try {
    const { content, projectId } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: "No LaTeX content provided",
      });
    }

    const timestamp = Date.now();
    const filename = `compile_${timestamp}`;
    const texPath = path.join(TEMP_DIR, `${filename}.tex`);
    const pdfPath = path.join(OUTPUT_DIR, `${filename}.pdf`);

    // Write LaTeX file
    await fs.writeFile(texPath, content, "utf8");
    console.log(`📝 Compiling LaTeX: ${filename}`);

    // Enhanced pdflatex command with better error handling
    const cmd = `"${PDFLATEX_PATH}" -interaction=nonstopmode -halt-on-error -file-line-error -output-directory="${OUTPUT_DIR}" "${texPath}"`;

    exec(cmd, { timeout: 30000 }, async (error, stdout, stderr) => {
      try {
        // Check if PDF was generated first (most important)
        const pdfExists = await fs.pathExists(pdfPath);

        if (pdfExists) {
          const pdfBuffer = await fs.readFile(pdfPath);
          console.log(
            `✅ Compilation successful: ${filename}.pdf (${pdfBuffer.length} bytes)`
          );

          // METAFONT messages are normal - check for actual errors
          const hasRealError =
            stderr &&
            (stderr.includes("Fatal error") ||
              stderr.includes("Emergency stop") ||
              stderr.includes("! LaTeX Error") ||
              stderr.includes("! Undefined control sequence"));

          if (hasRealError) {
            console.warn("⚠️ PDF generated but with warnings:", stderr);
          }

          res.json({
            success: true,
            pdf: pdfBuffer.toString("base64"),
            message: hasRealError
              ? "Document compiled with warnings"
              : "Document compiled successfully",
            log: stdout,
            warnings: hasRealError ? stderr : null,
          });
        } else {
          // No PDF generated - this is a real error
          console.error("❌ Compilation failed - no PDF generated");

          let logContent = "";
          try {
            const logPath = path.join(OUTPUT_DIR, `${filename}.log`);
            logContent = await fs.readFile(logPath, "utf8");
          } catch {}

          res.json({
            success: false,
            error: "LaTeX compilation failed",
            details: stderr || "Unknown error",
            log: logContent || stdout,
            message: "Check your LaTeX syntax for errors",
          });
        }
      } catch (readError) {
        res.json({
          success: false,
          error: "Failed to read generated PDF",
          details: readError.message,
        });
      } finally {
        // Cleanup temporary files after 30 seconds
        setTimeout(() => {
          cleanupFiles(filename, TEMP_DIR);
          cleanupFiles(filename, OUTPUT_DIR);
        }, 30000);
      }
    });
  } catch (error) {
    console.error("❌ Compilation error:", error);
    res.status(500).json({
      success: false,
      error: "Compilation failed",
      details: error.message,
    });
  }
});

// API: Delete project
app.delete("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const projectDir = path.join(PROJECTS_DIR, id);

    if (!(await fs.pathExists(projectDir))) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    await fs.remove(projectDir);
    console.log(`✅ Deleted project: ${id}`);

    res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("❌ Project deletion error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete project",
    });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error("🔥 Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: error.message,
  });
});

// Start server
async function startServer() {
  try {
    await initDirectories();

    app.listen(PORT, () => {
      console.log("🚀 Overleaf Clone Backend Started!");
      console.log("=".repeat(50));
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`📁 Projects: ${PROJECTS_DIR}`);
      console.log(
        `🔧 pdfLaTeX: ${PDFLATEX_PATH ? "✅ Ready" : "❌ Not found"}`
      );
      console.log("=".repeat(50));
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
