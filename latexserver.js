// import express from "express";
// import { promises as fs } from "fs";
// import path from "path";
// import { spawn } from "child_process";
// import cors from "cors";
// import { fileURLToPath } from "url";
// import { dirname } from "path";
// import sharp from "sharp";

// // Get __dirname equivalent in ES modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const app = express();

// // Middleware
// app.use(express.json({ limit: "10mb" }));
// app.use(cors());

// // Directory paths
// const equationsDir = path.join(__dirname, "equations");
// const tempDir = path.join(__dirname, "temp");
// const outputDir = path.join(__dirname, "output");
// const citationsDir = path.join(__dirname, "citations");
// // Initialize directories
// async function initDirectories() {
//   try {
//     await fs.mkdir(equationsDir, { recursive: true });
//     await fs.mkdir(tempDir, { recursive: true });
//     await fs.mkdir(outputDir, { recursive: true });
//     await fs.mkdir(citationsDir, { recursive: true }); // Add this line
//     console.log("✅ Directories initialized successfully");
//   } catch (error) {
//     console.error("❌ Failed to create directories:", error);
//   }
// }

// // Utility function to run pdflatex
// function runPdfLatex(texFilePath, outputPath) {
//   return new Promise((resolve, reject) => {
//     const pdflatex = spawn(
//       "pdflatex",
//       [
//         "-output-directory=" + outputPath,
//         "-interaction=nonstopmode",
//         "-halt-on-error",
//         texFilePath,
//       ],
//       {
//         cwd: path.dirname(texFilePath),
//       }
//     );

//     let stdout = "";
//     let stderr = "";

//     pdflatex.stdout.on("data", (data) => {
//       stdout += data.toString();
//     });

//     pdflatex.stderr.on("data", (data) => {
//       stderr += data.toString();
//     });

//     pdflatex.on("close", (code) => {
//       if (code === 0) {
//         console.log("✅ PDF compilation successful");
//         resolve(stdout);
//       } else {
//         console.log("❌ PDF compilation failed with code:", code);
//         reject(
//           new Error(`pdflatex failed with code ${code}:\n${stderr}\n${stdout}`)
//         );
//       }
//     });

//     pdflatex.on("error", (error) => {
//       console.log("❌ Failed to start pdflatex:", error.message);
//       reject(
//         new Error(
//           `Failed to start pdflatex: ${error.message}. Make sure pdflatex is installed and in PATH.`
//         )
//       );
//     });
//   });
// }

// // Utility function to clean up auxiliary files
// async function cleanupAuxFiles(basePath, fileName) {
//   const extensions = [".aux", ".log", ".fdb_latexmk", ".fls"];
//   for (const ext of extensions) {
//     try {
//       await fs.unlink(path.join(basePath, fileName + ext));
//     } catch (error) {
//       // Ignore errors for cleanup
//     }
//   }
// }

// async function convertPdfToImage(pdfPath, outputPath) {
//   return new Promise((resolve, reject) => {
//     // Use pdftoppm to convert PDF to PNG with high DPI
//     const pdftoppm = spawn("pdftoppm", [
//       "-png",
//       "-singlefile",
//       "-r",
//       "300", // High resolution
//       pdfPath,
//       outputPath.replace(".png", ""),
//     ]);

//     let stderr = "";

//     pdftoppm.stderr.on("data", (data) => {
//       stderr += data.toString();
//     });

//     pdftoppm.on("close", (code) => {
//       if (code === 0) {
//         resolve(`${outputPath.replace(".png", "")}.png`);
//       } else {
//         reject(new Error(`pdftoppm failed: ${stderr}`));
//       }
//     });

//     pdftoppm.on("error", (error) => {
//       reject(new Error(`Failed to start pdftoppm: ${error.message}`));
//     });
//   });
// }

// // Function to auto-crop image to content
// async function cropImageToContent(imagePath, outputPath) {
//   try {
//     const image = sharp(imagePath);
//     const { width, height } = await image.metadata();

//     // Get image buffer to analyze
//     const buffer = await image.raw().toBuffer();

//     // Find content bounds (non-white pixels)
//     const bounds = await findContentBounds(buffer, width, height);

//     // Crop with some padding
//     const padding = 20;
//     const cropOptions = {
//       left: Math.max(0, bounds.left - padding),
//       top: Math.max(0, bounds.top - padding),
//       width: Math.min(width, bounds.right - bounds.left + 2 * padding),
//       height: Math.min(height, bounds.bottom - bounds.top + 2 * padding),
//     };

//     await image.extract(cropOptions).png({ quality: 100 }).toFile(outputPath);

//     return outputPath;
//   } catch (error) {
//     console.error("Crop error:", error);
//     // If cropping fails, just copy the original
//     await sharp(imagePath).toFile(outputPath);
//     return outputPath;
//   }
// }

// async function findContentBounds(buffer, width, height) {
//   const channels = 3; // RGB
//   let minX = width,
//     maxX = 0,
//     minY = height,
//     maxY = 0;

//   for (let y = 0; y < height; y++) {
//     for (let x = 0; x < width; x++) {
//       const index = (y * width + x) * channels;
//       const r = buffer[index];
//       const g = buffer[index + 1];
//       const b = buffer[index + 2];

//       // Check if pixel is not white (accounting for slight variations)
//       if (r < 250 || g < 250 || b < 250) {
//         minX = Math.min(minX, x);
//         maxX = Math.max(maxX, x);
//         minY = Math.min(minY, y);
//         maxY = Math.max(maxY, y);
//       }
//     }
//   }

//   return {
//     left: minX === width ? 0 : minX,
//     right: maxX === 0 ? width : maxX,
//     top: minY === height ? 0 : minY,
//     bottom: maxY === 0 ? height : maxY,
//   };
// }

// // API endpoint to compile LaTeX
// app.post("/api/latex/compile", async (req, res) => {
//   console.log("📝 Received LaTeX compilation request");

//   try {
//     const {
//       latex,
//       isTemp = true,
//       fileName = "temp",
//       format = "pdf",
//     } = req.body;

//     if (!latex) {
//       return res.status(400).json({ error: "LaTeX code is required" });
//     }

//     // Sanitize filename
//     const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, "_");
//     const baseFileName = isTemp ? "temp" : sanitizedFileName;
//     const texFileName = `${baseFileName}.tex`;
//     const pdfFileName = `${baseFileName}.pdf`;
//     const imgFileName = `${baseFileName}.png`;

//     const texFilePath = path.join(tempDir, texFileName);
//     const pdfFilePath = path.join(outputDir, pdfFileName);
//     const imgFilePath = path.join(outputDir, imgFileName);

//     // Create minimal LaTeX document for tight rendering
//     const minimalLatexDocument = `\\documentclass[border=2pt,varwidth=true]{standalone}
// \\usepackage{amsmath}
// \\usepackage{amsfonts}
// \\usepackage{amssymb}
// \\usepackage{mathtools}
// \\usepackage{xcolor}
// \\begin{document}
// \\begin{displaymath}
// ${latex.replace(/[‹›]/g, "")}
// \\end{displaymath}
// \\end{document}`;

//     // Write LaTeX file
//     console.log("📄 Writing LaTeX file:", texFileName);
//     await fs.writeFile(texFilePath, minimalLatexDocument, "utf8");

//     // Compile to PDF
//     console.log("🔧 Compiling LaTeX to PDF...");
//     await runPdfLatex(texFilePath, outputDir);

//     // Check if PDF was created
//     try {
//       await fs.access(pdfFilePath);
//       console.log("✅ PDF file created successfully:", pdfFileName);
//     } catch {
//       throw new Error("PDF compilation succeeded but output file not found");
//     }

//     let finalUrl = `/output/${pdfFileName}`;
//     let finalFileName = pdfFileName;

//     // Convert to image if requested or by default for better preview
//     if (format === "image" || format === "png") {
//       try {
//         console.log("🖼️ Converting PDF to image...");
//         const rawImagePath = await convertPdfToImage(pdfFilePath, imgFilePath);
//         const croppedImagePath = path.join(outputDir, `cropped_${imgFileName}`);

//         console.log("✂️ Cropping image to content...");
//         await cropImageToContent(rawImagePath, croppedImagePath);

//         finalUrl = `/output/cropped_${imgFileName}`;
//         finalFileName = `cropped_${imgFileName}`;

//         console.log("✅ Image created and cropped successfully");
//       } catch (imageError) {
//         console.error(
//           "⚠️ Image conversion failed, falling back to PDF:",
//           imageError.message
//         );
//         // Fallback to PDF if image conversion fails
//       }
//     }

//     // Cleanup auxiliary files
//     await cleanupAuxFiles(outputDir, baseFileName);

//     res.json({
//       success: true,
//       pdfUrl: finalUrl,
//       fileName: finalFileName,
//       message: "LaTeX compiled successfully",
//       format: finalUrl.endsWith(".png") ? "image" : "pdf",
//     });
//   } catch (error) {
//     console.error("❌ Compilation error:", error.message);
//     res.status(500).json({
//       error: `Compilation failed: ${error.message}`,
//       details: error.stack,
//     });
//   }
// });

// // API endpoint to save equation
// app.post("/api/equations/save", async (req, res) => {
//   console.log("💾 Received equation save request");

//   try {
//     const { fileName, latex } = req.body;

//     if (!fileName || !latex) {
//       return res.status(400).json({ error: "fileName and latex are required" });
//     }

//     // Sanitize filename
//     const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, "_");
//     const fullFileName = `${sanitizedFileName}.tex`;
//     const filePath = path.join(equationsDir, fullFileName);

//     // Check if file already exists
//     try {
//       await fs.access(filePath);
//       console.log("⚠️ File already exists, overwriting:", fullFileName);
//     } catch {
//       console.log("📝 Creating new equation file:", fullFileName);
//     }

//     // Save the raw LaTeX (not the full document)
//     await fs.writeFile(filePath, latex, "utf8");

//     console.log("✅ Equation saved successfully:", sanitizedFileName);
//     res.json({
//       success: true,
//       fileName: sanitizedFileName,
//       message: "Equation saved successfully",
//     });
//   } catch (error) {
//     console.error("❌ Save error:", error);
//     res.status(500).json({
//       error: `Save failed: ${error.message}`,
//       details: error.stack,
//     });
//   }
// });

// // API endpoint to list all saved equations
// app.get("/api/equations/list", async (req, res) => {
//   console.log("📋 Received request to list equations");

//   try {
//     const files = await fs.readdir(equationsDir);
//     const texFiles = files.filter((file) => file.endsWith(".tex"));

//     console.log(`📚 Found ${texFiles.length} equation files`);

//     const equations = await Promise.all(
//       texFiles.map(async (file) => {
//         const filePath = path.join(equationsDir, file);
//         const content = await fs.readFile(filePath, "utf8");
//         const stats = await fs.stat(filePath);
//         const fileName = path.basename(file, ".tex");

//         return {
//           fileName: fileName,
//           latex: content,
//           lastModified: stats.mtime,
//           fileSize: stats.size,
//         };
//       })
//     );

//     // Sort by last modified (newest first)
//     equations.sort(
//       (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
//     );

//     res.json(equations);
//   } catch (error) {
//     console.error("❌ List error:", error);
//     res.status(500).json({
//       error: `Failed to list equations: ${error.message}`,
//       details: error.stack,
//     });
//   }
// });

// // API endpoint to load a specific equation
// app.get("/api/equations/load/:filename", async (req, res) => {
//   console.log("📖 Received request to load equation:", req.params.filename);

//   try {
//     const { filename } = req.params;

//     // Sanitize filename
//     const sanitizedFileName = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
//     const fullFileName = `${sanitizedFileName}.tex`;
//     const filePath = path.join(equationsDir, fullFileName);

//     // Check if file exists
//     try {
//       await fs.access(filePath);
//     } catch {
//       console.log("❌ Equation file not found:", fullFileName);
//       return res.status(404).json({ error: "Equation file not found" });
//     }

//     const content = await fs.readFile(filePath, "utf8");
//     const stats = await fs.stat(filePath);

//     console.log("✅ Equation loaded successfully:", sanitizedFileName);
//     res.json({
//       fileName: sanitizedFileName,
//       latex: content,
//       lastModified: stats.mtime,
//       fileSize: stats.size,
//     });
//   } catch (error) {
//     console.error("❌ Load error:", error);
//     res.status(500).json({
//       error: `Failed to load equation: ${error.message}`,
//       details: error.stack,
//     });
//   }
// });

// // API endpoint to delete an equation
// app.delete("/api/equations/:filename", async (req, res) => {
//   console.log("🗑️ Received request to delete equation:", req.params.filename);

//   try {
//     const { filename } = req.params;

//     const sanitizedFileName = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
//     const fullFileName = `${sanitizedFileName}.tex`;
//     const filePath = path.join(equationsDir, fullFileName);

//     await fs.unlink(filePath);

//     console.log("✅ Equation deleted successfully:", sanitizedFileName);
//     res.json({
//       success: true,
//       message: "Equation deleted successfully",
//       fileName: sanitizedFileName,
//     });
//   } catch (error) {
//     if (error.code === "ENOENT") {
//       console.log(
//         "❌ Equation file not found for deletion:",
//         req.params.filename
//       );
//       return res.status(404).json({ error: "Equation file not found" });
//     }
//     console.error("❌ Delete error:", error);
//     res.status(500).json({
//       error: `Failed to delete equation: ${error.message}`,
//       details: error.stack,
//     });
//   }
// });

// // API endpoint to get server status and system info
// app.get("/api/status", async (req, res) => {
//   try {
//     // Check if pdflatex is available
//     const testPdfLatex = () => {
//       return new Promise((resolve) => {
//         const test = spawn("pdflatex", ["--version"]);
//         test.on("close", (code) => {
//           resolve(code === 0);
//         });
//         test.on("error", () => {
//           resolve(false);
//         });
//       });
//     };

//     const pdflatexAvailable = await testPdfLatex();

//     // Get directory info
//     const getDirectoryInfo = async (dir) => {
//       try {
//         const files = await fs.readdir(dir);
//         return { exists: true, fileCount: files.length };
//       } catch {
//         return { exists: false, fileCount: 0 };
//       }
//     };

//     const [equationsInfo, tempInfo, outputInfo] = await Promise.all([
//       getDirectoryInfo(equationsDir),
//       getDirectoryInfo(tempDir),
//       getDirectoryInfo(outputDir),
//     ]);

//     res.json({
//       status: "running",
//       pdflatexAvailable,
//       directories: {
//         equations: equationsInfo,
//         temp: tempInfo,
//         output: outputInfo,
//       },
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: "error",
//       error: error.message,
//     });
//   }
// });

// // API endpoint to compile citation
// app.post("/api/citation/compile", async (req, res) => {
//   console.log("📚 Received citation compilation request");

//   try {
//     const {
//       authors,
//       title,
//       journal,
//       volume,
//       issue,
//       pages,
//       year,
//       doi,
//       format,
//       citationNumber,
//       customLatex,
//     } = req.body;

//     let citationLatex = "";

//     // CASE 1: Request from Recompile (has customLatex)
//     if (customLatex) {
//       console.log("🔄 Recompiling with custom LaTeX");
//       citationLatex = customLatex;
//     }
//     // CASE 2: Request from Generate Citation (has form data)
//     else {
//       console.log("🆕 Generating new citation from form data");
//       if (!authors || !title || !year) {
//         return res
//           .status(400)
//           .json({ error: "Authors, title, and year are required" });
//       }

//       // Generate citation based on format
//       switch (format) {
//         case "IEEE":
//           citationLatex = generateIEEECitation({
//             authors,
//             title,
//             journal,
//             volume,
//             issue,
//             pages,
//             year,
//             doi,
//           });
//           break;
//         case "APA":
//           citationLatex = generateAPACitation({
//             authors,
//             title,
//             journal,
//             volume,
//             issue,
//             pages,
//             year,
//             doi,
//           });
//           break;
//         case "MLA":
//           citationLatex = generateMLACitation({
//             authors,
//             title,
//             journal,
//             volume,
//             issue,
//             pages,
//             year,
//             doi,
//           });
//           break;
//         case "Chicago":
//           citationLatex = generateChicagoCitation({
//             authors,
//             title,
//             journal,
//             volume,
//             issue,
//             pages,
//             year,
//             doi,
//           });
//           break;
//         case "Harvard":
//           citationLatex = generateHarvardCitation({
//             authors,
//             title,
//             journal,
//             volume,
//             issue,
//             pages,
//             year,
//             doi,
//           });
//           break;
//         default:
//           citationLatex = generateIEEECitation({
//             authors,
//             title,
//             journal,
//             volume,
//             issue,
//             pages,
//             year,
//             doi,
//           });
//       }
//     }

//     const timestamp = Date.now();
//     const baseFileName = `citation_${timestamp}`;
//     const texFileName = `${baseFileName}.tex`;
//     const pdfFileName = `${baseFileName}.pdf`;
//     const imgFileName = `${baseFileName}.png`;

//     const texFilePath = path.join(tempDir, texFileName);
//     const pdfFilePath = path.join(outputDir, pdfFileName);
//     const imgFilePath = path.join(outputDir, imgFileName);

//     // Use a proper reference list format with hanging indent
//     const latexDocument = `\\documentclass[12pt]{article}
// \\usepackage[letterpaper, margin=1in]{geometry}
// \\usepackage{times}
// \\usepackage{url}
// \\usepackage{hyperref}
// \\usepackage{parskip}
// \\setlength{\\parindent}{-0.2in}
// \\setlength{\\leftskip}{0.2in}
// \\setlength{\\parskip}{6pt}
// \\pagestyle{empty}
// \\begin{document}
// \\noindent
// \\textbf{References}

// \\vspace{10pt}

// \\noindent
// [${citationNumber || 1}] ${citationLatex}
// \\end{document}`;

//     // Write LaTeX file
//     await fs.writeFile(texFilePath, latexDocument, "utf8");

//     // Compile to PDF
//     await runPdfLatex(texFilePath, outputDir);

//     // Check if PDF was created
//     await fs.access(pdfFilePath);

//     // Convert to image - NO CROPPING, just convert as-is
//     try {
//       const rawImagePath = await convertPdfToImage(pdfFilePath, imgFilePath);

//       // Just use the converted image as-is, no cropping
//       const finalImagePath = path.join(outputDir, `final_${imgFileName}`);
//       await sharp(rawImagePath).png({ quality: 100 }).toFile(finalImagePath);

//       // Cleanup auxiliary files
//       await cleanupAuxFiles(outputDir, baseFileName);

//       res.json({
//         success: true,
//         previewUrl: `/output/final_${imgFileName}`,
//         latexCode: citationLatex, // Return just the citation content
//         format: format,
//         message: customLatex
//           ? "Citation recompiled successfully"
//           : "Citation generated successfully",
//       });
//     } catch (imageError) {
//       console.error("⚠️ Image conversion failed:", imageError.message);
//       res.status(500).json({ error: "Image conversion failed" });
//     }
//   } catch (error) {
//     console.error("❌ Citation compilation error:", error.message);
//     res.status(500).json({
//       error: `Citation compilation failed: ${error.message}`,
//       details: error.stack,
//     });
//   }
// });

// // API endpoint to save citation
// app.post("/api/citation/save", async (req, res) => {
//   console.log("💾 Received citation save request");

//   try {
//     const { fileName, citationData, latexCode } = req.body;

//     if (!fileName || !citationData || !latexCode) {
//       return res
//         .status(400)
//         .json({ error: "fileName, citationData, and latexCode are required" });
//     }

//     const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, "_");
//     const fullFileName = `${sanitizedFileName}.json`;
//     const filePath = path.join(citationsDir, fullFileName);

//     const citationRecord = {
//       ...citationData,
//       latexCode,
//       createdAt: new Date().toISOString(),
//       fileName: sanitizedFileName,
//     };

//     await fs.writeFile(
//       filePath,
//       JSON.stringify(citationRecord, null, 2),
//       "utf8"
//     );

//     res.json({
//       success: true,
//       fileName: sanitizedFileName,
//       message: "Citation saved successfully",
//     });
//   } catch (error) {
//     console.error("❌ Citation save error:", error);
//     res.status(500).json({
//       error: `Save failed: ${error.message}`,
//     });
//   }
// });

// // API endpoint to list saved citations
// app.get("/api/citation/list", async (req, res) => {
//   console.log("📋 Received request to list citations");

//   try {
//     const files = await fs.readdir(citationsDir);
//     const jsonFiles = files.filter((file) => file.endsWith(".json"));

//     const citations = await Promise.all(
//       jsonFiles.map(async (file) => {
//         const filePath = path.join(citationsDir, file);
//         const content = await fs.readFile(filePath, "utf8");
//         const data = JSON.parse(content);
//         return data;
//       })
//     );

//     // Sort by creation date (newest first)
//     citations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

//     res.json(citations);
//   } catch (error) {
//     console.error("❌ List citations error:", error);
//     res.status(500).json({
//       error: `Failed to list citations: ${error.message}`,
//     });
//   }
// });

// // API endpoint to delete citation
// app.delete("/api/citation/:filename", async (req, res) => {
//   console.log("🗑️ Received request to delete citation:", req.params.filename);

//   try {
//     const { filename } = req.params;
//     const sanitizedFileName = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
//     const fullFileName = `${sanitizedFileName}.json`;
//     const filePath = path.join(citationsDir, fullFileName);

//     await fs.unlink(filePath);

//     res.json({
//       success: true,
//       message: "Citation deleted successfully",
//       fileName: sanitizedFileName,
//     });
//   } catch (error) {
//     if (error.code === "ENOENT") {
//       return res.status(404).json({ error: "Citation file not found" });
//     }
//     res.status(500).json({
//       error: `Failed to delete citation: ${error.message}`,
//     });
//   }
// });

// // Citation format generators
// function generateIEEECitation({
//   authors,
//   title,
//   journal,
//   volume,
//   issue,
//   pages,
//   year,
//   doi,
// }) {
//   let citation = authors;
//   citation += `, "${title}," `;
//   if (journal) citation += `\\textit{${journal}}`;
//   if (volume) citation += `, ${volume}`;
//   if (issue) citation += `, no. ${issue}`;
//   if (pages) citation += `, pp. ${pages}`;
//   citation += `, ${year}.`;
//   if (doi) citation += ` DOI: ${doi}.`;
//   return citation;
// }

// function generateAPACitation({
//   authors,
//   title,
//   journal,
//   volume,
//   issue,
//   pages,
//   year,
//   doi,
// }) {
//   // Parse first author for APA format
//   const authorList = authors.split(",")[0].trim() + " et al.";
//   let citation = `${authorList} (${year}). ${title}. `;
//   if (journal) citation += `\\textit{${journal}}`;
//   if (volume) citation += `, \\textit{${volume}}`;
//   if (issue) citation += `(${issue})`;
//   if (pages) citation += `, ${pages}`;
//   citation += `.`;
//   if (doi) citation += ` https://doi.org/${doi}`;
//   return citation;
// }

// function generateMLACitation({
//   authors,
//   title,
//   journal,
//   volume,
//   issue,
//   pages,
//   year,
//   doi,
// }) {
//   let citation = authors.split(",")[0].trim() + ", et al. ";
//   citation += `"${title}." `;
//   if (journal) citation += `\\textit{${journal}}`;
//   if (volume) citation += `, vol. ${volume}`;
//   if (issue) citation += `, no. ${issue}`;
//   citation += `, ${year}`;
//   if (pages) citation += `, pp. ${pages}`;
//   citation += `.`;
//   return citation;
// }

// function generateChicagoCitation({
//   authors,
//   title,
//   journal,
//   volume,
//   issue,
//   pages,
//   year,
//   doi,
// }) {
//   let citation = authors.split(",")[0].trim() + ", et al. ";
//   citation += `"${title}." `;
//   if (journal) citation += `\\textit{${journal}}`;
//   if (volume) citation += ` ${volume}`;
//   if (issue) citation += `, no. ${issue}`;
//   citation += ` (${year})`;
//   if (pages) citation += `: ${pages}`;
//   citation += `.`;
//   if (doi) citation += ` https://doi.org/${doi}.`;
//   return citation;
// }

// function generateHarvardCitation({
//   authors,
//   title,
//   journal,
//   volume,
//   issue,
//   pages,
//   year,
//   doi,
// }) {
//   const firstAuthor = authors.split(",")[0].trim();
//   let citation = `${firstAuthor} et al. (${year}) `;
//   citation += `'${title}', `;
//   if (journal) citation += `\\textit{${journal}}`;
//   if (volume) citation += `, ${volume}`;
//   if (issue) citation += `(${issue})`;
//   if (pages) citation += `, pp. ${pages}`;
//   citation += `.`;
//   if (doi) citation += ` doi: ${doi}`;
//   return citation;
// }

// // Serve static files (PDFs and assets)
// app.use(
//   "/output",
//   express.static(outputDir, {
//     setHeaders: (res, path) => {
//       if (path.endsWith(".pdf")) {
//         res.setHeader("Content-Type", "application/pdf");
//         res.setHeader("Cache-Control", "no-cache");
//       }
//     },
//   })
// );

// // Health check endpoint
// app.get("/health", (req, res) => {
//   res.json({
//     status: "healthy",
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//   });
// });

// // Root endpoint
// app.get("/", (req, res) => {
//   res.json({
//     message: "LaTeX Math Input API Server (ES6 Modules)",
//     version: "1.0.0",
//     moduleType: "ES6",
//     endpoints: {
//       "POST /api/latex/compile": "Compile LaTeX to PDF",
//       "POST /api/equations/save": "Save equation",
//       "GET /api/equations/list": "List all equations",
//       "GET /api/equations/load/:filename": "Load specific equation",
//       "DELETE /api/equations/:filename": "Delete equation",
//       "GET /api/status": "Server status",
//       "GET /output/:filename": "Serve PDF files",
//     },
//   });
// });

// // Error handling middleware
// app.use((error, req, res, next) => {
//   console.error("🔥 Unhandled error:", error);
//   res.status(500).json({
//     error: "Internal server error",
//     message: error.message,
//     timestamp: new Date().toISOString(),
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     error: "Endpoint not found",
//     path: req.path,
//     method: req.method,
//   });
// });

// // Start server
// const PORT = process.env.PORT || 5000;

// async function startServer() {
//   try {
//     await initDirectories();

//     app.listen(PORT, () => {
//       console.log("🚀 LaTeX API Server Started Successfully! (ES6 Modules)");
//       console.log("=".repeat(60));
//       console.log(`📡 Server URL: http://localhost:${PORT}`);
//       console.log(`📂 Equations Dir: ${equationsDir}`);
//       console.log(`📂 Temp Dir: ${tempDir}`);
//       console.log(`📂 Output Dir: ${outputDir}`);
//       console.log(`📦 Module System: ES6 (import/export)`);
//       console.log("=".repeat(60));
//       console.log("🔗 Available Endpoints:");
//       console.log("   POST /api/latex/compile - Compile LaTeX");
//       console.log("   POST /api/equations/save - Save equation");
//       console.log("   GET  /api/equations/list - List equations");
//       console.log("   GET  /api/equations/load/:filename - Load equation");
//       console.log("   DELETE /api/equations/:filename - Delete equation");
//       console.log("   GET  /api/status - Server status");
//       console.log("   GET  /output/:filename - Serve PDFs");
//       console.log("=".repeat(60));

//       // Test pdflatex availability
//       const testPdfLatex = spawn("pdflatex", ["--version"]);
//       testPdfLatex.on("close", (code) => {
//         if (code === 0) {
//           console.log("✅ pdflatex is available and ready");
//         } else {
//           console.log("❌ WARNING: pdflatex not found or not working");
//           console.log("   Please install TeX Live or MiKTeX");
//         }
//       });
//       testPdfLatex.on("error", () => {
//         console.log("❌ WARNING: pdflatex not found in PATH");
//         console.log("   Please install TeX Live or MiKTeX and add to PATH");
//       });
//     });
//   } catch (error) {
//     console.error("❌ Failed to start server:", error);
//     process.exit(1);
//   }
// }

// startServer();

// // Graceful shutdown
// process.on("SIGINT", () => {
//   console.log("\n🛑 Gracefully shutting down server...");
//   process.exit(0);
// });

// process.on("SIGTERM", () => {
//   console.log("\n🛑 Server terminated");
//   process.exit(0);
// });

// export default app;
