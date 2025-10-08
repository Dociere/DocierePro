import React, { useState, useEffect, useCallback, useRef } from "react";
import MonacoEditor from "@monaco-editor/react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import axios from "axios";
import "../App.css";

// const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const API_URL = "http://localhost:5000";

const OverleafEditor = () => {
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeFile, setActiveFile] = useState("main.tex");
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationStatus, setCompilationStatus] = useState("");
  const [compilationMessage, setCompilationMessage] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [richTextContent, setRichTextContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Monaco Editor reference and cursor position
  const monacoEditorRef = useRef(null);
  const [latexContent, setLatexContent] = useState(""); // Local LaTeX state

  // Sync control
  const isUpdatingFromLatex = useRef(false);
  const isUpdatingFromRichText = useRef(false);
  const updateTimeout = useRef(null);

  useEffect(() => {
    loadProjects();
    checkServerHealth();
  }, []);

  // Extract LaTeX body content (content after \maketitle or \begin{document})
  const extractLatexBody = useCallback((latex) => {
    // Find the actual content start
    const beginDocIndex = latex.indexOf("\\begin{document}");
    if (beginDocIndex === -1) return latex;

    const afterBeginDoc = latex.substring(
      beginDocIndex + "\\begin{document}".length
    );
    const endDocIndex = afterBeginDoc.indexOf("\\end{document}");

    if (endDocIndex === -1) return afterBeginDoc;

    let content = afterBeginDoc.substring(0, endDocIndex);

    // Remove \maketitle if it's at the beginning
    content = content.replace(/^\s*\\maketitle\s*/, "").trim();

    return content;
  }, []);

  // Reconstruct full LaTeX document EXACTLY as it was
  const reconstructLatexDocument = useCallback(
    (originalLatex, newBodyContent) => {
      const beginDocIndex = originalLatex.indexOf("\\begin{document}");
      const endDocIndex = originalLatex.lastIndexOf("\\end{document}");

      if (beginDocIndex === -1 || endDocIndex === -1) {
        return originalLatex; // Return original if structure is broken
      }

      const preamble = originalLatex.substring(
        0,
        beginDocIndex + "\\begin{document}".length
      );
      const hasmaketitle = originalLatex.includes("\\maketitle");

      let reconstructed = preamble;

      if (hasmaketitle) {
        reconstructed += "\n\n\\maketitle\n\n";
      } else {
        reconstructed += "\n\n";
      }

      reconstructed += newBodyContent;
      reconstructed += "\n\n\\end{document}";

      return reconstructed;
    },
    []
  );

  // Convert LaTeX body to Rich Text HTML (FIXED LISTS)
  const latexToRichText = useCallback((latexBody) => {
    if (!latexBody) return "";

    return (
      latexBody
        // Sections
        .replace(/\\section\{([^}]*)\}/g, "<h2>$1</h2>")
        .replace(/\\subsection\{([^}]*)\}/g, "<h3>$1</h3>")
        .replace(/\\subsubsection\{([^}]*)\}/g, "<h4>$1</h4>")

        // Text formatting
        .replace(/\\textbf\{([^}]*)\}/g, "<strong>$1</strong>")
        .replace(/\\textit\{([^}]*)\}/g, "<em>$1</em>")
        .replace(/\\emph\{([^}]*)\}/g, "<em>$1</em>")
        .replace(/\\underline\{([^}]*)\}/g, "<u>$1</u>")

        // FIXED: Lists (Proper handling of \item)
        .replace(
          /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
          (match, content) => {
            // Split by \item and filter out empty items
            const items = content
              .split(/\\item\s*/)
              .filter((item) => item.trim())
              .map((item) => {
                // Clean up each item content
                const cleanItem = item
                  .trim()
                  .replace(/\n\s*$/, "") // Remove trailing newlines
                  .replace(/\n/g, " ") // Convert newlines to spaces
                  .trim();
                return cleanItem ? `<li>${cleanItem}</li>` : "";
              })
              .filter((item) => item) // Remove empty items
              .join("");
            return `<ul>${items}</ul>`;
          }
        )

        .replace(
          /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
          (match, content) => {
            // Split by \item and filter out empty items
            const items = content
              .split(/\\item\s*/)
              .filter((item) => item.trim())
              .map((item) => {
                // Clean up each item content
                const cleanItem = item
                  .trim()
                  .replace(/\n\s*$/, "") // Remove trailing newlines
                  .replace(/\n/g, " ") // Convert newlines to spaces
                  .trim();
                return cleanItem ? `<li>${cleanItem}</li>` : "";
              })
              .filter((item) => item) // Remove empty items
              .join("");
            return `<ol>${items}</ol>`;
          }
        )

        // Math - Keep as LaTeX but make it visible
        .replace(
          /\\\[([\s\S]*?)\\\]/g,
          '<div style="text-align: center; background: #f8f9fa; padding: 10px; margin: 10px 0; border-left: 4px solid #007bff; font-family: monospace;">\\[$1\\]</div>'
        )
        .replace(
          /\$([^$\n]+)\$/g,
          '<span style="background: #e9ecef; padding: 2px 4px; border-radius: 3px; color: #d63384;">$$1$</span>'
        )

        // Convert line breaks to paragraphs (AFTER list processing)
        .replace(/\n\s*\n/g, "</p><p>")
        .replace(/^/, "<p>")
        .replace(/$/, "</p>")

        // Clean up empty paragraphs and fix structure
        .replace(/<p>\s*<\/p>/g, "")
        .replace(/<p>(\s*<h[1-6])/g, "$1")
        .replace(/(<\/h[1-6]>\s*)<\/p>/g, "$1")
        .replace(/<p>(\s*<[uo]l)/g, "$1")
        .replace(/(<\/[uo]l>\s*)<\/p>/g, "$1")
        .replace(/<p>(\s*<div)/g, "$1")
        .replace(/(<\/div>\s*)<\/p>/g, "$1")

        .trim()
    );
  }, []);

  // Convert Rich Text HTML back to LaTeX body (FIXED LISTS)
  // Convert Rich Text HTML back to LaTeX body (IMPROVED LIST HANDLING)
  const richTextToLatex = useCallback((html) => {
    if (!html) return "";

    return (
      html
        // Convert headings
        .replace(/<h2[^>]*>([^<]*)<\/h2>/g, "\n\\section{$1}\n")
        .replace(/<h3[^>]*>([^<]*)<\/h3>/g, "\n\\subsection{$1}\n")
        .replace(/<h4[^>]*>([^<]*)<\/h4>/g, "\n\\subsubsection{$1}\n")

        // Convert formatting
        .replace(/<strong[^>]*>([^<]*)<\/strong>/g, "\\textbf{$1}")
        .replace(/<b[^>]*>([^<]*)<\/b>/g, "\\textbf{$1}")
        .replace(/<em[^>]*>([^<]*)<\/em>/g, "\\textit{$1}")
        .replace(/<i[^>]*>([^<]*)<\/i>/g, "\\textit{$1}")
        .replace(/<u[^>]*>([^<]*)<\/u>/g, "\\underline{$1}")

        // IMPROVED: Convert lists (Handle ReactQuill's nested structure)
        .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, (match, content) => {
          // Extract all list items, handling nested content
          let items = "";
          const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/g;
          let liMatch;

          while ((liMatch = liRegex.exec(content)) !== null) {
            const itemContent = liMatch[1]
              .replace(/<[^>]+>/g, "") // Remove HTML tags
              .replace(/\s+/g, " ") // Normalize whitespace
              .trim();

            if (itemContent) {
              items += `    \\item ${itemContent}\n`;
            }
          }

          return items ? `\n\\begin{itemize}\n${items}\\end{itemize}\n` : "";
        })

        .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, (match, content) => {
          // Extract all list items, handling nested content
          let items = "";
          const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/g;
          let liMatch;

          while ((liMatch = liRegex.exec(content)) !== null) {
            const itemContent = liMatch[1]
              .replace(/<[^>]+>/g, "") // Remove HTML tags
              .replace(/\s+/g, " ") // Normalize whitespace
              .trim();

            if (itemContent) {
              items += `    \\item ${itemContent}\n`;
            }
          }

          return items
            ? `\n\\begin{enumerate}\n${items}\\end{enumerate}\n`
            : "";
        })

        // Convert math back (preserve LaTeX)
        .replace(/<div[^>]*>\\\[([\s\S]*?)\\\]<\/div>/g, "\n\\[$1\\]\n")
        .replace(/<span[^>]*>\$([^$]*?)\$<\/span>/g, "$$1$")

        // Convert paragraphs
        .replace(/<p[^>]*>([^<]*)<\/p>/g, "$1\n\n")
        .replace(/<br\s*\/?>/g, "\n")

        // Remove remaining HTML tags
        .replace(/<[^>]+>/g, "")

        // Clean up whitespace
        .replace(/\n\s*\n\s*\n+/g, "\n\n")
        .replace(/^\s+|\s+$/g, "")
        .trim()
    );
  }, []);

  // Update Rich Text when LaTeX changes (WITH VALIDATION)
  useEffect(() => {
    if (
      currentProject &&
      activeFile &&
      currentProject.files[activeFile] &&
      !isUpdatingFromRichText.current
    ) {
      isUpdatingFromLatex.current = true;

      const latexDoc = currentProject.files[activeFile].content;

      // Validate LaTeX document structure
      if (
        latexDoc.includes("\\begin{document}") &&
        latexDoc.includes("\\end{document}")
      ) {
        const bodyContent = extractLatexBody(latexDoc);
        const richTextHtml = latexToRichText(bodyContent);
        setRichTextContent(richTextHtml);
      } else {
        console.warn("Invalid LaTeX document structure detected");
      }

      setTimeout(() => {
        isUpdatingFromLatex.current = false;
      }, 100);
    }
  }, [currentProject, activeFile, extractLatexBody, latexToRichText]);

  // Update local LaTeX content when project changes
  useEffect(() => {
    if (currentProject && activeFile && currentProject.files[activeFile]) {
      setLatexContent(currentProject.files[activeFile].content);
    }
  }, [currentProject, activeFile]);

  // API functions
  const checkServerHealth = async () => {
    try {
      await axios.get(`${API_URL}/api/health`);
    } catch (error) {
      setError(
        "Cannot connect to server. Please make sure the backend is running."
      );
    }
  };

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/projects`);
      setProjects(response.data);

      if (response.data.length > 0) {
        loadProject(response.data[0].id);
      }
    } catch (error) {
      setError("Failed to load projects: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProject = async (projectId) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/projects/${projectId}`);
      setCurrentProject(response.data.project);
      setActiveFile(response.data.project.activeFile || "main.tex");
      setError("");
    } catch (error) {
      setError("Failed to load project: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async () => {
    const name = prompt("Enter project name:");
    if (!name) return;

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/api/projects/create`, {
        name,
      });
      await loadProjects();
      loadProject(response.data.project.id);
    } catch (error) {
      setError("Failed to create project: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProject = async () => {
    if (!currentProject) return;

    try {
      await axios.put(`${API_URL}/api/projects/${currentProject.id}`, {
        files: currentProject.files,
        activeFile: activeFile,
      });

      setCompilationStatus("success");
      setCompilationMessage("Project saved successfully");
      setTimeout(() => {
        setCompilationStatus("");
        setCompilationMessage("");
      }, 3000);
    } catch (error) {
      setError("Failed to save project: " + error.message);
    }
  };

  const compileDocument = async () => {
    if (!currentProject || !activeFile) return;

    setIsCompiling(true);
    setCompilationStatus("compiling");
    setCompilationMessage("Compiling document...");

    try {
      // Use the current LaTeX content for compilation
      const contentToCompile = latexContent;

      // Validate document before compilation
      if (
        !contentToCompile.includes("\\begin{document}") ||
        !contentToCompile.includes("\\end{document}")
      ) {
        throw new Error("Invalid LaTeX document structure");
      }

      console.log(
        "Compiling LaTeX document:",
        contentToCompile.substring(0, 200) + "..."
      );

      const response = await axios.post(`${API_URL}/api/compile`, {
        content: contentToCompile,
        projectId: currentProject.id,
      });

      if (response.data.success) {
        const pdfBlob = new Blob(
          [Uint8Array.from(atob(response.data.pdf), (c) => c.charCodeAt(0))],
          { type: "application/pdf" }
        );
        const newPdfUrl = URL.createObjectURL(pdfBlob);

        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }

        setPdfUrl(newPdfUrl);
        setCompilationStatus("success");
        setCompilationMessage("PDF compiled successfully!");

        // Auto-save after successful compilation
        await saveProject();
      } else {
        setCompilationStatus("error");
        setCompilationMessage(`Compilation failed: ${response.data.error}`);
        console.log("Compilation details:", response.data);
      }
    } catch (error) {
      setCompilationStatus("error");
      setCompilationMessage("Compilation failed: " + error.message);
      console.error("Compilation error:", error);
    } finally {
      setIsCompiling(false);
      setTimeout(() => {
        setCompilationStatus("");
        setCompilationMessage("");
      }, 8000);
    }
  };

  // Handle Monaco Editor changes (FIXED - No cursor jumping)
  const handleLatexChange = (value) => {
    if (currentProject && activeFile && !isUpdatingFromLatex.current) {
      // Update local state immediately (no re-render of Monaco)
      setLatexContent(value);

      // Debounced update to project state
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }

      updateTimeout.current = setTimeout(() => {
        setCurrentProject((prev) => ({
          ...prev,
          files: {
            ...prev.files,
            [activeFile]: {
              ...prev.files[activeFile],
              content: value,
            },
          },
        }));
      }, 300);
    }
  };

  // Handle Rich Text Editor changes (FIXED)
  const handleRichTextChange = (value) => {
    if (currentProject && activeFile && !isUpdatingFromLatex.current) {
      // Immediately update rich text
      setRichTextContent(value);

      // Clear timeout
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }

      // Debounced LaTeX update
      updateTimeout.current = setTimeout(() => {
        isUpdatingFromRichText.current = true;

        const newBodyContent = richTextToLatex(value);
        const originalLatex = latexContent;
        const newLatexDocument = reconstructLatexDocument(
          originalLatex,
          newBodyContent
        );

        // Validate the reconstructed document
        if (
          newLatexDocument.includes("\\begin{document}") &&
          newLatexDocument.includes("\\end{document}")
        ) {
          setLatexContent(newLatexDocument);
          setCurrentProject((prev) => ({
            ...prev,
            files: {
              ...prev.files,
              [activeFile]: {
                ...prev.files[activeFile],
                content: newLatexDocument,
              },
            },
          }));
        }

        setTimeout(() => {
          isUpdatingFromRichText.current = false;
        }, 100);
      }, 1000); // Reduced from 1500 to 1000ms for better responsiveness
    }
  };

  const quillModules = {
    toolbar: {
      container: [
        [{ header: [2, 3, 4, false] }],
        ["bold", "italic", "underline"],
        ["custom-list-ordered", "custom-list-bullet"], // Custom list buttons
        [{ indent: "-1" }, { indent: "+1" }],
        ["blockquote", "code-block"],
        ["link"],
        ["clean"],
      ],
      handlers: {
        "custom-list-ordered": function () {
          const selection = this.quill.getSelection();
          if (selection) {
            // Insert a simple numbered list format
            this.quill.insertText(selection.index, "\n1. ", "user");
            this.quill.setSelection(selection.index + 4);
          }
        },
        "custom-list-bullet": function () {
          const selection = this.quill.getSelection();
          if (selection) {
            // Insert a simple bullet list format
            this.quill.insertText(selection.index, "\n• ", "user");
            this.quill.setSelection(selection.index + 3);
          }
        },
      },
    },
    clipboard: {
      matchVisual: false,
    },
  };

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="overleaf-container">
      {/* Header */}
      <div className="overleaf-header">
        <div className="overleaf-logo">Dociere</div>
        <div className="overleaf-project-name">
          {currentProject ? currentProject.name : "No Project Selected"}
        </div>
        <div className="overleaf-actions">
          <button className="btn-header" onClick={createProject}>
            📁 New Project
          </button>
          <button
            className="btn-header"
            onClick={saveProject}
            disabled={!currentProject}
          >
            💾 Save
          </button>
          <button
            className="btn-header primary"
            onClick={compileDocument}
            disabled={!currentProject || isCompiling}
          >
            {isCompiling ? "🔄 Compiling..." : "🚀 Compile PDF"}
          </button>
        </div>
      </div>

      <div className="overleaf-main">
        {/* Sidebar */}
        <div className="overleaf-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">Projects</div>
            {projects.map((project) => (
              <div
                key={project.id}
                className={`file-item ${
                  currentProject && currentProject.id === project.id
                    ? "active"
                    : ""
                }`}
                onClick={() => loadProject(project.id)}
              >
                <span className="file-icon">📁</span>
                <span>{project.name}</span>
              </div>
            ))}
          </div>

          {currentProject && (
            <div className="sidebar-section">
              <div className="sidebar-title">Files</div>
              {Object.keys(currentProject.files).map((fileName) => (
                <div
                  key={fileName}
                  className={`file-item ${
                    fileName === activeFile ? "active" : ""
                  }`}
                  onClick={() => setActiveFile(fileName)}
                >
                  <span className="file-icon">📄</span>
                  <span>{fileName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor Area */}
        <div className="overleaf-editor-area">
          <div className="editor-content">
            {/* LaTeX Code Editor Panel */}
            <div className="code-panel">
              <div className="code-panel-header">
                <div className="panel-title">
                  📝 LaTeX Source ({activeFile || "No file selected"})
                </div>
              </div>
              <div className="monaco-editor-container">
                {currentProject && activeFile && (
                  <MonacoEditor
                    height="100%"
                    defaultLanguage="latex"
                    value={latexContent} // Use local state, not project state
                    onChange={handleLatexChange}
                    theme="vs-light"
                    onMount={(editor, monaco) => {
                      monacoEditorRef.current = editor;
                    }}
                    options={{
                      minimap: { enabled: true },
                      fontSize: 14,
                      lineNumbers: "on",
                      wordWrap: "on",
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      folding: true,
                      selectOnLineNumbers: true,
                      roundedSelection: false,
                      readOnly: false,
                      cursorStyle: "line",
                      automaticLayout: true,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Rich Text Editor Panel */}
            <div className="preview-panel">
              <div className="preview-panel-header">
                <div className="panel-title">📖 Rich Text Editor</div>
                {pdfUrl && (
                  <div className="preview-controls">
                    <button
                      className="btn-view-pdf"
                      onClick={() => window.open(pdfUrl, "_blank")}
                    >
                      📄 View PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Compilation Status */}
              {compilationStatus && (
                <div className={`compilation-status ${compilationStatus}`}>
                  {compilationMessage}
                </div>
              )}

              {/* Rich Text Content */}
              <div className="preview-content">
                <div className="preview-edit-mode">
                  <ReactQuill
                    theme="snow"
                    value={richTextContent}
                    onChange={handleRichTextChange}
                    modules={quillModules}
                    placeholder="Edit your document content here. Math formulas like $E=mc^2$ and \[F=ma\] are preserved. Changes sync with LaTeX code automatically."
                    style={{ height: "calc(100% - 42px)" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button
            style={{
              float: "right",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => setError("")}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default OverleafEditor;
