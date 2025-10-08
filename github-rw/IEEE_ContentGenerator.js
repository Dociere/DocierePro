const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const readline = require("readline");
require("dotenv").config();
const axios = require("axios");

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: "AKIAQKGGXMNR67JIFBM5",
    secretAccessKey: "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",
  },
});

const BUCKET_NAME = "lexidoc-2-dev-bucket";
// const GEMINI_API_URL = "http://192.168.77.78:5000/generate";
const GEMINI_API_URL = "http://localhost:5002/generate";

// Dummy author details (replace with actual data from DB if needed)
const AUTHORS = [
  {
    name: "Alice Wonder",
    degree: "PhD in Computer Science",
    email: "alice@example.com",
    organization: "XYZ University",
  },
  {
    name: "Bob Builder",
    degree: "MSc in Software Engineering",
    email: "bob@example.com",
    organization: "ABC Tech",
  },
];

async function sendToGemini({ code, title, authors, prompt = "" }) {
  try {
    const ieeeResponse = await axios.post(GEMINI_API_URL, {
      //   model: "gemini-pro",
      title: title,
      authors: authors,
      prompt: prompt,
      code: code,
    });

    console.log("Response from Gemini:");
    console.log(ieeeResponse.data);

    return ieeeResponse.data;
  } catch (err) {
    console.log("Error sending to Gemini:", err.message);
  }
}

async function readFileFromS3(s3Key) {
  const getObjectCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  try {
    const data = await s3Client.send(getObjectCommand);
    const stream = data.Body;

    let fileContent = "";
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      fileContent += `${line}\n`;
    }

    return fileContent; // Return the content instead of sending immediately
  } catch (err) {
    console.error(`Error reading file ${s3Key}:`, err);
    return ""; // Return empty string if there's an error
  }
}

async function generateIEEEContent(email, projectName, title, prompt, authors) {
  //   const email = process.env.EMAIL;
  //   const projectName = process.env.PROJECT_NAME;
  //   const title = process.env.TITLE || "Untitled Paper";
  //   const prompt = process.env.PROMPT || "";

  if (!email || !projectName) {
    console.error("Environment variables EMAIL and PROJECT_NAME must be set.");
    return;
  }

  if (!title || !authors || authors.length === 0) {
    console.error("Error: Title and Authors are required.");
    return;
  }

  const prefix = `${email}/${projectName}/`;

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });

  try {
    const data = await s3Client.send(command);
    const files = data.Contents;
    let allFileContent = ""; // Store combined content

    if (files && files.length > 0) {
      console.log(`Files for project "${projectName}" under "${email}":`);

      for (const file of files) {
        if (file.Key === `${email}/${projectName}/README.md`) continue; // Skip README
        console.log(`- ${file.Key}`);

        const fileContent = await readFileFromS3(file.Key);
        allFileContent += `\n\n======= FILE: ${file.Key} =======\n\n${fileContent}`;
      }

      if (allFileContent.trim() !== "") {
        const ieeeContent = await sendToGemini({
          code: allFileContent,
          title: title,
          authors: authors,
          //   authors: AUTHORS,
          prompt: prompt,
        });

        console.log(
          "\n\n This is IEEE Content in generateIEEEContent.-----------------------\n\n"
        );
        console.log(ieeeContent);

        return ieeeContent;
      } else {
        console.log("No valid file content to send.");
      }
    } else {
      console.log(
        `No files found for project "${projectName}" under "${email}".`
      );
    }
  } catch (err) {
    console.error("Error listing files in S3:", err);
  }
}

// generateIEEEContent();

module.exports = {
  generateIEEEContent,
};
