import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.resolve(__dirname, "../public/dociereLogo.svg");
const buildDir = path.resolve(__dirname, "../build");

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir);
}

sharp(svgPath)
  .resize(1024, 1024)
  .png()
  .toFile(path.join(buildDir, "icon.png"))
  .then(() => console.log("Icon generated successfully!"))
  .catch((err) => console.error("Error generating icon:", err));
