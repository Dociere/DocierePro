const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

const PORT = process.env.PORT;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5000",
      
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize Gemini with correct package
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/generate-latex", async (req, res) => {
  try {
    const { userIdea, title, templateType, authorDetails } = req.body;

    // Validation
    if (!userIdea || !title) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userIdea and title are required",
      });
    }

    const prompt = `You are a LaTeX document generator. Your task is to create a complete, valid LaTeX document.

CRITICAL INSTRUCTIONS:
1. Output ONLY raw LaTeX code - no explanations, no markdown formatting, no code blocks
2. Do NOT wrap your response in \`\`\`latex or \`\`\` or any other markdown syntax
3. Start directly with \\documentclass and end with \\end{document}
4. The output must be immediately compilable LaTeX code
5. Do NOT include any text before \\documentclass or after \\end{document}
6. Do NOT add any commentary, explanations, or notes outside the LaTeX code
7. If the user idea is vague, make reasonable assumptions to create a coherent document
8. Ensure proper LaTeX syntax and structure throughout the document

[VERY IMPORTANT]if Template Type is Blank Document, ONLY,:-
1. Use this exact syntax to add sections: \\section{Section Title}
2. Use this exact syntax to add subsections: \\subsection{Subsection Title}


Here are the details for the document you need to generate:

Document Requirements:
- Title: ${title}
- Template Type: ${templateType || "article"}
- Author: ${authorDetails?.name || "Author"}
${authorDetails?.email ? `- Email: ${authorDetails.email}` : ""}
${
  authorDetails?.affiliation
    ? `- Affiliation: ${authorDetails.affiliation}`
    : ""
}

Content Brief:
${userIdea}

Generate a professional ${templateType || "article"} document with:
- Appropriate document class (article, report, book, etc.)
- Essential packages (geometry, inputenc, graphicx, hyperref, amsmath, etc.)
- Proper structure (title, author, abstract if applicable, sections, subsections as needed)
- Well-formatted content based on the user's idea
- Professional typography and layout
- Bibliography section if references are mentioned

IMPORTANT: Your ENTIRE response must be valid LaTeX code. Start with \\documentclass and end with \\end{document}. Nothing else.`;

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let latexContent = response.text();

    // Robust trimming logic to remove markdown code blocks
    latexContent = latexContent.trim();

    // Remove markdown code blocks with various formats
    // Pattern 1: ```latex ... ```
    if (latexContent.startsWith("```latex")) {
      latexContent = latexContent
        .replace(/^```latex\n?/, "")
        .replace(/\n?```$/, "");
    }
    // Pattern 2: ```tex ... ```
    else if (latexContent.startsWith("```tex")) {
      latexContent = latexContent
        .replace(/^```tex\n?/, "")
        .replace(/\n?```$/, "");
    }
    // Pattern 3: ``` ... ```
    else if (latexContent.startsWith("```")) {
      latexContent = latexContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    // Remove any remaining backticks at start/end
    latexContent = latexContent.replace(/^`+/, "").replace(/`+$/, "");

    // Final trim
    latexContent = latexContent.trim();

    // Validate that we have LaTeX content
    if (
      !latexContent.includes("\\documentclass") ||
      !latexContent.includes("\\end{document}")
    ) {
      throw new Error(
        "Generated content does not appear to be valid LaTeX. Please try again."
      );
    }

    res.json({
      success: true,
      latexContent: latexContent,
    });
  } catch (error) {
    console.error("AI generation error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate LaTeX content",
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
