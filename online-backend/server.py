import os
import re
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Middleware / CORS Setup
# Replicating the specific origin and credentials settings from Express
CORS(app, resources={r"/*": {
    "origins": [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5000"
    ],
    "supports_credentials": True
}})

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY is missing in environment variables.")

genai.configure(api_key=GEMINI_API_KEY)

# Generation Configuration
generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
}

@app.route('/api/generate-latex', methods=['POST'])
def generate_latex():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No JSON body provided"}), 400

        user_idea = data.get('userIdea')
        title = data.get('title')
        template_type = data.get('templateType', 'article')
        author_details = data.get('authorDetails', {})

        # Validation
        if not user_idea or not title:
            return jsonify({
                "success": False, 
                "error": "Missing required fields: userIdea and title are required"
            }), 400

        # Construct Author String safely
        author_name = author_details.get('name', 'Author')
        author_email = f"- Email: {author_details['email']}" if author_details.get('email') else ""
        author_affiliation = f"- Affiliation: {author_details['affiliation']}" if author_details.get('affiliation') else ""

        # Construct Prompt
        prompt = f"""You are a LaTeX document generator. Your task is to create a complete, valid LaTeX document.

CRITICAL INSTRUCTIONS:
1. Output ONLY raw LaTeX code - no explanations, no markdown formatting, no code blocks
2. Do NOT wrap your response in ```latex or ``` or any other markdown syntax
3. Start directly with \\documentclass and end with \\end{{document}}
4. The output must be immediately compilable LaTeX code
5. Do NOT include any text before \\documentclass or after \\end{{document}}
6. Do NOT add any commentary, explanations, or notes outside the LaTeX code
7. If the user idea is vague, make reasonable assumptions to create a coherent document
8. Ensure proper LaTeX syntax and structure throughout the document

[VERY IMPORTANT]if Template Type is Blank Document, ONLY,:-
1. Use this exact syntax to add sections: \\section{{Section Title}}
2. Use this exact syntax to add subsections: \\subsection{{Subsection Title}}

Here are the details for the document you need to generate:

Document Requirements:
- Title: {title}
- Template Type: {template_type}
- Author: {author_name}
{author_email}
{author_affiliation}

Content Brief:
{user_idea}

Generate a professional {template_type} document with:
- Appropriate document class (article, report, book, etc.)
- Essential packages (geometry, inputenc, graphicx, hyperref, amsmath, etc.)
- Proper structure (title, author, abstract if applicable, sections, subsections as needed)
- Well-formatted content based on the user's idea
- Professional typography and layout
- Bibliography section if references are mentioned

IMPORTANT: Your ENTIRE response must be valid LaTeX code. Start with \\documentclass and end with \\end{{document}}. Nothing else."""

        # Get Generative Model
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash", # Updated to current efficient model equivalent
            generation_config=generation_config
        )

        # Generate Content
        response = model.generate_content(prompt)
        latex_content = response.text.strip()

        # Robust trimming logic (Optimized with Regex)
        # Removes ```latex, ```tex, or ``` at the start, and ``` at the end
        latex_content = re.sub(r'^```(latex|tex)?\s*', '', latex_content, flags=re.IGNORECASE)
        latex_content = re.sub(r'\s*```$', '', latex_content)
        
        # Remove any remaining backticks at start/end
        latex_content = latex_content.strip('`').strip()

        # Validate that we have LaTeX content
        if "\\documentclass" not in latex_content or "\\end{document}" not in latex_content:
            raise ValueError("Generated content does not appear to be valid LaTeX.")

        return jsonify({
            "success": True,
            "latexContent": latex_content
        })

    except Exception as e:
        logger.error(f"AI generation error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e) or "Failed to generate LaTeX content"
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Server is running"})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    # In production, use a WSGI server like gunicorn. For dev, this is fine.
    print(f"Server is running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)