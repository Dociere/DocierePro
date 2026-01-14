from flask import Blueprint, request, jsonify
import os, re, logging
import google.generativeai as genai
from ..utils.latex_helpers import build_prompt, clean_latex

logger = logging.getLogger(__name__)
latex_bp = Blueprint("latex", __name__)

# Initialize Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY is missing.")
genai.configure(api_key=GEMINI_API_KEY)

generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
}

@latex_bp.route('/generate-latex', methods=['POST'])
def generate_latex():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No JSON body provided"}), 400

        user_idea = data.get('userIdea')
        title = data.get('title')
        template_type = data.get('templateType', 'article')
        author_details = data.get('authorDetails', {})

        if not user_idea or not title:
            return jsonify({"success": False, "error": "userIdea and title required"}), 400

        prompt = build_prompt(title, template_type, user_idea, author_details)

        # Generate content
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config=generation_config
        )
        response = model.generate_content(prompt)
        latex_content = clean_latex(response.text)

        return jsonify({
            "success": True,
            "latexContent": latex_content
        })

    except Exception as e:
        logger.error(f"AI generation error: {str(e)}")
        return jsonify({"success": False, "error": str(e) or "Failed to generate LaTeX"}), 500
