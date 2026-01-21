const fs = require("fs");
const path = require("path");
const axios = require("axios");
const AdmZip = require("adm-zip");
const mime = require("mime-types");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// 🔹 AWS S3 Configuration (Keys Hardcoded)
const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: "AKIAQKGGXMNR67JIFBM5",
    secretAccessKey: "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",
  },
});
const S3_BUCKET = "lexidoc-2-dev-bucket";

// 🔹 Function to Get GitHub API URL
function getRepoApiUrl(repoUrl) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)(?:\.git)?$/);
  if (!match) throw new Error("❌ Invalid GitHub URL format.");
  return `https://api.github.com/repos/${match[1]}/${match[2]}/zipball`;
}

// 🔹 Download and Extract Repository

async function downloadAndExtractRepo(repoUrl) {
  const apiUrl = getRepoApiUrl(repoUrl);
  console.log(`📥 Downloading repository: ${repoUrl}...`);

  const response = await axios({
    url: apiUrl,
    method: "GET",
    responseType: "arraybuffer",
  });

  const zipPath = path.join(__dirname, "repo.zip");
  fs.writeFileSync(zipPath, response.data);

  // 🔹 Define extraction path
  const extractPath = path.join("/tmp", "extracted_repo");

  // 🔥 Add this code at **Line 21** (before extracting the zip)
  if (fs.existsSync(extractPath)) {
    fs.rmSync(extractPath, { recursive: true, force: true }); // Clears old files
    console.log("🗑️ Cleared old extracted files.");
  }

  console.log("📂 Extracting repository...");
  fs.mkdirSync(extractPath, { recursive: true }); // Ensure the folder exists

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractPath, true);
  fs.unlinkSync(zipPath); // Clean up ZIP file

  console.log("✅ Extraction complete.");
  return extractPath;
}

// 🔹 Upload File to S3
async function uploadFile(filePath, s3Key) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: fs.createReadStream(filePath),
    ContentType: mime.lookup(filePath) || "application/octet-stream",
  });

  try {
    await s3Client.send(command);
    console.log(`✅ Uploaded: ${s3Key}`);
  } catch (err) {
    console.error(`❌ Failed to upload ${s3Key}:`, err);
  }
}

// 🔹 Upload Directory to S3
function uploadDirectory(directoryPath, userEmail, projectTitle, prefix = "") {
  const entries = fs.readdirSync(directoryPath);
  entries.forEach((entry) => {
    const entryPath = path.join(directoryPath, entry);
    const s3Key = `${userEmail}/${projectTitle}/${prefix}${entry}`;

    if (fs.lstatSync(entryPath).isDirectory()) {
      uploadDirectory(entryPath, userEmail, projectTitle, `${prefix}${entry}/`);
    } else {
      uploadFile(entryPath, s3Key);
    }
  });
}

// 🔹 Express Route Handler
function sanitizeProjectTitle(title) {
  return title.trim().replace(/\s+/g, "_").toLowerCase();
}

async function processRepository(req, res) {
  try {
    const { gitRepositoryUrl, userEmail, projectId } = req.body;
    const sanitizedProjectId = sanitizeProjectTitle(projectId);

    if (!gitRepositoryUrl || !userEmail || !projectId) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    console.log("🚀 Processing repository...");
    const extractedPath = await downloadAndExtractRepo(gitRepositoryUrl);
    uploadDirectory(extractedPath, userEmail, sanitizedProjectId);

    return res.json({ message: "✅ Upload completed successfully!" });
  } catch (error) {
    console.error("❌ Error processing repository:", error);
    return res.status(500).json({ error: "Failed to process repository." });
  }
}

// 🔹 Export Function
module.exports = { processRepository };
