import React, { useState, useEffect } from "react";
import SlateEditorPanel from "../components/slateEditor.jsx";
import { parseLatexToAst, printAstToLatex } from "../utils/latexAstEngine.jsx";

const INITIAL_LATEX = `\\section{Introduction}
This is a test of the \\textbf{AST Sync Engine}. 

If you type here, it should update Slate. If you type in Slate, it should update here!

\\begin{table}[h]
\\centering
\\begin{tabular}{|c|c|}
\\hline
 AST & Slate \\\\ \\hline
 Works & Perfectly \\\\ \\hline
\\end{tabular}
\\end{table}

\\subsection{Next Steps}
Try making this text \\textit{italic} in the visual editor.`;

const TestSlatePage = () => {
  const [rawString, setRawString] = useState(INITIAL_LATEX);
  const [globalAst, setGlobalAst] = useState(null);

  // Initialize the AST on first load
  useEffect(() => {
    const initialAst = parseLatexToAst(INITIAL_LATEX);
    setGlobalAst(initialAst);
  }, []);

  // Handler for typing in the raw text area
  const handleRawStringChange = (e) => {
    const newString = e.target.value;
    setRawString(newString);

    // Parse to AST and push to Slate
    const newAst = parseLatexToAst(newString);
    if (newAst) {
      setGlobalAst(newAst);
    }
  };

  // Handler for typing in the Slate visual editor
  const handleSlateChange = (newAst) => {
    setGlobalAst(newAst);

    // Convert back to string and push to the text area
    const newString = printAstToLatex(newAst);
    setRawString(newString);
  };

  if (!globalAst) return <div className="p-8">Loading AST Engine...</div>;

  return (
    <div className="flex h-screen w-screen bg-gray-100 p-4 gap-4 overflow-hidden">
      {/* Left Side: Raw LaTeX String */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2 text-sm font-semibold flex justify-between items-center">
          <span>Raw LaTeX String (Simulating Monaco)</span>
        </div>
        <textarea
          className="flex-1 w-full p-6 font-mono text-sm text-gray-800 outline-none resize-none"
          value={rawString}
          onChange={handleRawStringChange}
          spellCheck={false}
        />
      </div>

      {/* Right Side: Slate Visual Editor */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-blue-600 text-white px-4 py-2 text-sm font-semibold flex justify-between items-center">
          <span>Slate.js Visual View (Consuming AST)</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <SlateEditorPanel
            globalAst={globalAst}
            onAstChange={handleSlateChange}
          />
        </div>
      </div>
    </div>
  );
};

export default TestSlatePage;
