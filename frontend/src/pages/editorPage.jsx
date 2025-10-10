import React, { useState, useEffect, useCallback, useRef } from "react";
// import MonacoEditor from "@monaco-editor/react";
// import ReactQuill from "react-quill-new";
import MonacoEditorPanel from "../components/monacoEditor";
import RichTextEditorPanel from "../components/textEditor";
import "react-quill-new/dist/quill.snow.css";
import axios from "axios";
import "../App.css";
import {
  extractLatexBody,
  reconstructLatexDocument,
  latexToRichText,
  richTextToLatex,
} from "../utils/latexUtility.jsx";
import SectionSpace from "../components/sectionSpace.jsx";

// const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const API_URL = "http://localhost:5000";

const EditorPage = () => {
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

  // const createProject = async () => {
  //   const name = prompt("Enter project name:");
  //   if (!name) return;

  //   try {
  //     setIsLoading(true);
  //     const response = await axios.post(`${API_URL}/api/projects/create`, {
  //       name,
  //     });
  //     await loadProjects();
  //     loadProject(response.data.project.id);
  //   } catch (error) {
  //     setError("Failed to create project: " + error.message);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

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
      {/* <div className="overleaf-header">
        <div className="overleaf-logo">Dociere</div>
        <div className="overleaf-project-name">
          {currentProject ? currentProject.name : "No Project Selected"}
        </div>
        <div className="overleaf-actions"> */}
          {/* <button className="btn-header" onClick={createProject}>
            📁 New Project
          </button> */}
          {/* <button
            className="btn-header"
            onClick={saveProject}
            disabled={!currentProject}
          >
            💾 Save
          </button> */}
          {/* <button
            className="btn-header primary"
            onClick={compileDocument}
            disabled={!currentProject || isCompiling}
          >
            {isCompiling ? "🔄 Compiling..." : "🚀 Compile PDF"}
          </button> */}
        {/* </div> */}
      {/* </div> */}

      <div className="overleaf-main">
        {/* Sidebar */}
        {/* <SectionSpace
          projects={projects}
          currentProject={currentProject}
          activeFile={activeFile}
          loadProject={loadProject}
          setActiveFile={setActiveFile}
        /> */}


        {/* Editor Area */}
        <div className="overleaf-editor-area">
          <div className="editor-content">
            {/* LaTeX Code Editor Panel */}
            <MonacoEditorPanel
              value={latexContent}
              onChange={handleLatexChange}
              monacoEditorRef={monacoEditorRef}
              handleLatexChange={handleLatexChange}
            />

            {/* Rich Text Editor Panel */}
            <RichTextEditorPanel
              value={richTextContent}
              onChange={handleRichTextChange}
              quillModules={quillModules}
              compilationStatus={compilationStatus}
              compilationMessage={compilationMessage}
              pdfUrl={pdfUrl}
            />
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

export default EditorPage;
