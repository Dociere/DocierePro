const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const axios = require("axios");
const readline = require("readline");
require("dotenv").config();

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: "AKIAQKGGXMNR67JIFBM5",
    secretAccessKey: "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",
  },
});

const BUCKET_NAME = "lexidoc-2-dev-bucket";
const OLLAMA_API_URL = "http://192.168.86.78:5000/generate";

async function sendToOllama(fileContent, model = "gemini-pro") {
  try {
    const ieeeResponse = await axios.post(OLLAMA_API_URL, {
      model: model,
      prompt: `Tell me what this function does? Inside: ${fileContent}`,
    });

    return ieeeResponse.data; // Return response
  } catch (err) {
    throw new Error(`Error sending to Ollama: ${err.message}`);
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

    return await sendToOllama(fileContent);
  } catch (err) {
    throw new Error(`Error reading file ${s3Key}: ${err.message}`);
  }
}

// async function listFilesInS3(email, projectName) {
//   const prefix = `${email}/${projectName}/`;

//   const command = new ListObjectsV2Command({
//     Bucket: BUCKET_NAME,
//     Prefix: prefix,
//   });

//   try {
//     const data = await s3Client.send(command);
//     const files = data.Contents;

//     if (!files || files.length === 0) {
//       return {
//         message: `No files found for project "${projectName}" under "${email}".`,
//       };
//     }

//     let responses = [];
//     for (const file of files) {
//       if (file.Key.endsWith("README.md")) continue;
//       const result = await readFileFromS3(file.Key);
//       responses.push({ file: file.Key, response: result });
//     }

//     return responses;
//   } catch (err) {
//     throw new Error(`Error listing files in S3: ${err.message}`);
//   }
// }

// module.exports = {
//   listFilesInS3,
// };

async function listFilesInS3(email, projectName) {
  const sanitizedProjectName = sanitizeProjectTitle(projectName);
  const prefix = `${email}/${sanitizedProjectName}/`;

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });

  try {
    const data = await s3Client.send(command);
    const files = data.Contents;

    if (!files || files.length === 0) {
      return {
        message: `No files found for project "${projectName}" under "${email}".`,
      };
    }

    let responses = [];
    for (const file of files) {
      if (file.Key.endsWith("README.md")) continue;
      const result = await readFileFromS3(file.Key);
      responses.push({ file: file.Key, response: result });
    }

    return responses;
  } catch (err) {
    throw new Error(`Error listing files in S3: ${err.message}`);
  }
}

// 🔹 Function to sanitize project title for S3 storage
function sanitizeProjectTitle(title) {
  return title.trim().replace(/\s+/g, "_").toLowerCase();
}

module.exports = {
  listFilesInS3,
};
