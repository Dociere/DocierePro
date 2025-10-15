from flask import Flask, request, jsonify
import json
import google.generativeai as genai
import re

app = Flask(__name__)
genai.configure(api_key="AIzaSyCHyejdX9wwS7ma8jsBYUKyWmlnQLq-g9M")

SYSTEM_PROMPT_INIT = r"""
Your task is to generate two paragraphs each of abstract, keywords, introduction, methodology, results and discussion, conclusion, and context for a technical paper based on the source code functions, title, and prompt provided to you. The paragraphs should be formal and professional yet accessible to undergraduate students. Ensure the output is a STRINGIFIED JSON OBJECT.

Remember:
- STRICTLY FOLLOW "RESPONSE FORMAT" with no additional text outside the JSON object. Do not include explanations, comments, or any content before or after the JSON.
- Use clear, technical language but avoid overly complex jargon unless necessary.
- Format the text as if it would be directly inserted into a LaTeX document, using appropriate academic writing conventions.
- Maintain a tone that is professional and scholarly but approachable for students.
- Ensure all newlines and special characters (e.g., newlines, tabs) in the response are explicitly escaped for JSON compatibility (e.g., use \n for newlines, \t for tabs). Unescaped control characters will break JSON parsing.
- ENSURE ALL CONTENT THAT YOU GENERATE IS RELATED TO THE CODE BEING PASSED, IGNORE ALL FILE NAMES AND GITHUB-RELATED COMMENTS.
- The 'context' field describes what the provided code is about in 2-3 paragraphs, use it to ensure the generated content aligns with the code's purpose.
- Ensure a comma separates each key-value pair in the JSON object, especially after 'conclusion' before 'context'.

RESPONSE FORMAT:

{"abstract": "insert generated abstract content here including whatever latex syntax is needed",
 "keywords":"insert generated keywords from abstract content here including whatever latex syntax is needed",
 "introduction":"insert generated introduction content here including whatever latex syntax is needed(paragraph breaks, etc.)",
 "methodology":"insert generated methodology content here including whatever latex syntax is needed(paragraph breaks, etc.)",
 "results_and_discussion": "insert generated results and discussion content here including whatever latex syntax is needed(paragraph breaks, etc.)",
 "conclusion": "insert generated conclusion content here including whatever latex syntax is needed(paragraph breaks, etc.)",
 "context": "insert 2-3 paragraphs describing what the code is about here including whatever latex syntax is needed"}
"""

SYSTEM_PROMPT_MODIFY = r"""
Your task is to modify the provided section content (e.g., abstract) based on the user’s prompt and the original context of the code. The modified content should remain formal, professional, and accessible to undergraduate students, aligning with the original paper’s tone and purpose. Ensure the output is a STRINGIFIED JSON OBJECT containing only the modified section.

Remember:
- Use the provided 'context' to ensure the modified content remains relevant to the original code’s purpose.
- The 'section_content' is the original content to be modified.
- The 'prompt' specifies how to modify the section (e.g., "make it crisp" or "give a more detailed version").
- Ensure all newlines and special characters (e.g., newlines, tabs) in the response are explicitly escaped for JSON compatibility (e.g., use \n for newlines, \t for tabs). Unescaped control characters will break JSON parsing.
- Output only the JSON object with no additional text outside it.

RESPONSE FORMAT:
{"<section_name>": "insert modified section content here including whatever latex syntax is needed"}
"""

def clean_generated_content(content):
    latex_commands = [
        r"\\begin{.*?}", r"\\end{.*?}", r"\\section{.*?}", r"\\subsection{.*?}",
        r"\\maketitle", r"\\title{.*?}", r"\\author{.*?}", r"\\bibliography{.*?}", r"\\keywords{.*?}"
    ]
    for cmd in latex_commands:
        content = re.sub(cmd, '', content)
    return content.strip()

def generate_latex_paper(data, generated_content):
    title = data.get('title', 'Untitled Paper')
    authors = data.get('authors', [])
    
    abstract = clean_generated_content(generated_content.get('abstract', ''))
    keywords = clean_generated_content(generated_content.get('keywords', ''))
    introduction = clean_generated_content(generated_content.get('introduction', ''))
    methodology = clean_generated_content(generated_content.get('methodology', ''))
    results_and_discussion = clean_generated_content(generated_content.get('results_and_discussion', ''))
    conclusion = clean_generated_content(generated_content.get('conclusion', ''))

    latex = r"""
\documentclass[conference]{IEEEtran}
\IEEEoverridecommandlockouts
\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{algorithmic}
\usepackage{graphicx}
\usepackage{textcomp}
\usepackage{xcolor}
\usepackage{float}
\def\BibTeX{{\rm B\kern-.05em{{\sc i\kern-.025em b}}\kern-.08em
    T\kern-.1667em\lower.7ex\hbox{E}\kern-.125emX}}
\begin{document}
"""
    latex += f"\\title{{{title}}}\n"
    latex += "\\author{\n"
    author_blocks = [f"{author['name']}\\\\\\textit{{{author['degree']}}}\\\\\n{author['organization']}\\\\\n{author['email']}" for author in authors]
    latex += ' \\and '.join(author_blocks)
    latex += "\n}"
    latex += "\\maketitle\n\n"
    latex += f"\\begin{{abstract}}\n{abstract}\n\\end{{abstract}}\n\n"
    latex += f"\\begin{{IEEEkeywords}}\n{keywords}\n\\end{{IEEEkeywords}}\n\n"
    sections = {
        'Introduction': introduction,
        'Methodology': methodology,
        'Results and Discussions': results_and_discussion,
        'Conclusion': conclusion
    }
    for section, content in sections.items():
        latex += f"\\section{{{section}}}\n{content}\n\n"
    latex += "\\end{document}\n"
    return latex

def extract_json(text):
    print("Raw response from Gemini:", text)
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        json_str = json_match.group(0)
        print("Extracted JSON string:", json_str)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            print("JSON parsing error details:", str(e))
            # Fix unescaped newlines and control characters
            fixed_json = re.sub(r'(?<!\\)\n', r'\\n', json_str)  # Escape unescaped newlines
            fixed_json = re.sub(r'(?<!\\)\t', r'\\t', fixed_json)  # Escape unescaped tabs
            # Fix missing comma between key-value pairs (if applicable)
            fixed_json = re.sub(r'"\s*(?="[^:]*":)', r'", ', fixed_json)
            print("Attempted fixed JSON:", fixed_json)
            try:
                return json.loads(fixed_json)
            except json.JSONDecodeError as e:
                print("Failed to fix JSON:", str(e))
                return None
    print("No JSON found in response")
    return None

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    code = data.get('code', '')
    title = data.get('title', '')
    authors = data.get('authors', [])
    prompt = data.get('prompt', 'NO PROMPT GIVEN BY USER, JUST FOLLOW SYSTEM PROMPT')

    if not code or not title or not authors:
        return jsonify({"error": "Missing 'code', 'title', or 'authors' in request"}), 400

    model = genai.GenerativeModel('gemini-2.0-flash')
    chat = model.start_chat()
    query = f"SYSTEM_PROMPT: {SYSTEM_PROMPT_INIT} \n\n TITLE: {title} \n\n PROMPT: {prompt} \n\n CODE: {code}"
    response = chat.send_message(query)
    generated_content = extract_json(response.text)

    if not generated_content:
        return jsonify({"error": "Failed to generate valid JSON content"}), 500

    # Save the original generated content
    with open('original_content.json', 'w') as f:
        json.dump(generated_content, f)

    # Save the original request data
    with open('original_data.json', 'w') as f:
        json.dump(data, f)

    output_latex = generate_latex_paper(data, generated_content)
    return output_latex

@app.route('/modify', methods=['POST'])
def modify():
    data = request.json
    section_name = data.get('section_name', '').lower()
    modify_prompt = data.get('prompt', '')
    new_title = data.get('new_title', None)
    add_author = data.get('add_author', None)
    remove_author_email = data.get('remove_author_email', None)

    valid_sections = ['abstract', 'keywords', 'introduction', 'methodology', 'results_and_discussion', 'conclusion']
    if (section_name and (section_name not in valid_sections or not modify_prompt)) and \
       not new_title and not add_author and not remove_author_email:
        return jsonify({"error": "Invalid request: Provide a valid 'section_name' with 'prompt', 'new_title', 'add_author', or 'remove_author_email'"}), 400

    # Load the original content
    try:
        with open('original_content.json', 'r') as f:
            original_content = json.load(f)
    except FileNotFoundError:
        return jsonify({"error": "Original content not found. Run /generate first."}), 400

    # Load the original data
    try:
        with open('original_data.json', 'r') as f:
            original_data = json.load(f)
    except FileNotFoundError:
        return jsonify({"error": "Original data not found. Run /generate first."}), 400

    # Handle section modification if requested
    if section_name and modify_prompt:
        original_section_content = original_content.get(section_name, '')
        context = original_content.get('context', '')
        if not original_section_content:
            return jsonify({"error": f"No original content found for section '{section_name}'"}), 400
        if not context:
            return jsonify({"error": "No context found in original content"}), 400

        model = genai.GenerativeModel('gemini-2.0-flash')
        chat = model.start_chat()
        query = f"SYSTEM_PROMPT: {SYSTEM_PROMPT_MODIFY} \n\n SECTION_NAME: {section_name} \n\n PROMPT: {modify_prompt} \n\n CONTEXT: {context} \n\n SECTION_CONTENT: {original_section_content}"
        response = chat.send_message(query)
        modified_content = extract_json(response.text)

        if not modified_content or section_name not in modified_content:
            return jsonify({"error": "Failed to modify section content"}), 500

        # Update the original content with the modified section
        original_content[section_name] = modified_content[section_name]
        # Save the updated content back to the file
        with open('original_content.json', 'w') as f:
            json.dump(original_content, f)

    # Handle title modification if requested
    if new_title:
        original_data['title'] = new_title

    # Handle adding an author if requested
    if add_author:
        if not isinstance(add_author, dict) or not all(k in add_author for k in ['name', 'degree', 'organization', 'email']):
            return jsonify({"error": "'add_author' must be a JSON object with 'name', 'degree', 'organization', and 'email'"}), 400
        original_data['authors'].append(add_author)

    # Handle removing an author if requested
    if remove_author_email:
        original_data['authors'] = [author for author in original_data['authors'] if author['email'] != remove_author_email]
        if not original_data['authors']:
            return jsonify({"error": "Cannot remove the last author"}), 400

    # Save the updated original data back to the file if any changes were made
    if new_title or add_author or remove_author_email:
        with open('original_data.json', 'w') as f:
            json.dump(original_data, f)

    output_latex = generate_latex_paper(original_data, original_content)
    return output_latex

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5002)