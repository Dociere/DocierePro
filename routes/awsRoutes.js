const fs = require("fs");
const path = require("path");
const express = require("express");
const { processRepository } = require("../github-rw/builder");
const { listFilesInS3 } = require("../github-rw/reader");
const { generateIEEEContent } = require("../github-rw/IEEE_ContentGenerator");

const router = express.Router();

router.post("/upload-repo", processRepository);
router.post("/read-files", async (req, res) => {
  try {
    const { email, projectName } = req.body;

    if (!email || !projectName) {
      return res
        .status(400)
        .json({ error: "Email and Project Name are required" });
    }

    const formattedProjectName = projectName
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    console.log(
      "🔍 Checking S3 path:",
      `test@gmail.com/${formattedProjectName}`
    );

    const response = await listFilesInS3(email, formattedProjectName);

    if (response.length === 0) {
      console.warn("⚠️ No files found in S3 for:", formattedProjectName);
    }

    return res.json(response);
  } catch (err) {
    console.error("🔥 Error in /read-files:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const { email, projectName, title, prompt, authors } = req.body;
    if (!email || !projectName || !title || !authors)
      return res.status(400).json({ message: "Enter all the fields" });

    const formattedProjectName = projectName
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    console.log("🚀 Generating IEEE content for:", formattedProjectName);

    const ieeeContent = await generateIEEEContent(
      email,
      formattedProjectName,
      title,
      prompt,
      authors
    );

    if (!ieeeContent) {
      return res
        .status(400)
        .json({ message: "Failed to generate IEEE content." });
    }

    console.log("✅ IEEE content generated successfully.");

    const filePath = path.join(__dirname, "generated_paper.tex");

    fs.writeFile(filePath, ieeeContent, "utf8", (err) => {
      if (err) {
        console.error("❌ Error writing LaTeX file:", err);
        return res
          .status(500)
          .json({ message: "Failed to save LaTeX document." });
      }
      console.log("📄 LaTeX document saved at:", filePath);
      res.status(200).json({ success: true, filePath });
    });
  } catch (error) {
    console.error("🔥 Error in /generate:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

router.get("/load-latex", (req, res) => {
  const filePath = path.join(__dirname, "generated_paper.tex");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Error reading LaTeX file" });
    }
    res.json({ latexContent: data });
  });
});

module.exports = router;
