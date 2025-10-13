import React, { useState, useEffect, useRef } from "react";
import MonacoEditorPanel from "../components/monacoEditor";
import RichTextEditorPanel from "../components/textEditor";
import SectionEditor from "../components/sectionEditor";
import SectionSpace from "../components/sectionSpace";
import "react-quill-new/dist/quill.snow.css";
import axios from "axios";
import "../App.css";
import {
  extractLatexBody,
  reconstructLatexDocument,
  latexToRichText,
  richTextToLatex,
} from "../utils/latexUtility.jsx";

const API_URL = "http://localhost:5000";

const EditorPage = ({ isSectionSpaceOpen, setIsSectionSpaceOpen }) => {
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

  const [activeView, setActiveView] = useState("code");

  const monacoEditorRef = useRef(null);
  const [latexContent, setLatexContent] = useState("");

  const isUpdatingFromLatex = useRef(false);
  const isUpdatingFromRichText = useRef(false);
  const updateTimeout = useRef(null);

  useEffect(() => {
    loadProjects();
    checkServerHealth();
  }, []);

  useEffect(() => {
    if (
      currentProject &&
      activeFile &&
      currentProject.files[activeFile] &&
      !isUpdatingFromRichText.current
    ) {
      isUpdatingFromLatex.current = true;
      const latexDoc = currentProject.files[activeFile].content;

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
  }, [currentProject, activeFile]);

  useEffect(() => {
    if (currentProject && activeFile && currentProject.files[activeFile]) {
      setLatexContent(currentProject.files[activeFile].content);
    }
  }, [currentProject, activeFile]);

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
      const contentToCompile = latexContent;

      if (
        !contentToCompile.includes("\\begin{document}") ||
        !contentToCompile.includes("\\end{document}")
      ) {
        throw new Error("Invalid LaTeX document structure");
      }

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
        await saveProject();
      } else {
        setCompilationStatus("error");
        setCompilationMessage(`Compilation failed: ${response.data.error}`);
      }
    } catch (error) {
      setCompilationStatus("error");
      setCompilationMessage("Compilation failed: " + error.message);
    } finally {
      setIsCompiling(false);
      setTimeout(() => {
        setCompilationStatus("");
        setCompilationMessage("");
      }, 8000);
    }
  };

  const handleLatexChange = (value) => {
    if (currentProject && activeFile && !isUpdatingFromLatex.current) {
      setLatexContent(value);

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

  const handleRichTextChange = (value) => {
    if (currentProject && activeFile && !isUpdatingFromLatex.current) {
      setRichTextContent(value);

      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }

      updateTimeout.current = setTimeout(() => {
        isUpdatingFromRichText.current = true;
        const newBodyContent = richTextToLatex(value);
        const originalLatex = latexContent;
        const newLatexDocument = reconstructLatexDocument(
          originalLatex,
          newBodyContent
        );

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
      }, 1000);
    }
  };

  const quillModules = {
    toolbar: {
      container: [
        [{ header: [2, 3, 4, false] }],
        ["bold", "italic", "underline"],
        ["custom-list-ordered", "custom-list-bullet"],
        [{ indent: "-1" }, { indent: "+1" }],
        ["blockquote", "code-block"],
        ["link"],
        ["clean"],
      ],
      handlers: {
        "custom-list-ordered": function () {
          const selection = this.quill.getSelection();
          if (selection) {
            this.quill.insertText(selection.index, "\n1. ", "user");
            this.quill.setSelection(selection.index + 4);
          }
        },
        "custom-list-bullet": function () {
          const selection = this.quill.getSelection();
          if (selection) {
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* SectionSpace Overlay */}
      {isSectionSpaceOpen && (
        <div
          className="fixed left-14 bg-white border-r border-[#CFCFCF] shadow-lg overflow-y-auto"
          style={{ top: "44px", bottom: "0", width: "320px", zIndex: 60 }}
        >
          <div className="flex items-center justify-between p-4 border-b border-[#CFCFCF]">
            <h3 className="text-sm font-semibold">Section Space</h3>
            <button
              onClick={() => setIsSectionSpaceOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
              title="Close"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <SectionSpace
            projects={projects}
            currentProject={currentProject}
            activeFile={activeFile}
            loadProject={loadProject}
            setActiveFile={setActiveFile}
          />
        </div>
      )}

      {/* Main Content Area - Pushed right by sidebar width (64px = w-16) */}
      <div className="flex-1 flex ml-16">
        {/* Left Panel - Editor */}
        <div className="flex-1 flex flex-col border-r border-[#CFCFCF]">
          {/* Tab Container */}
          <div className="border-b border-[#CFCFCF] bg-white">
            <div className="px-2 py-1 flex items-center gap-1">
              <div
                onClick={() => setActiveView("code")}
                className={`px-4 py-2 cursor-pointer text-sm ${
                  activeView === "code"
                    ? "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0"
                    : "text-gray-600"
                }`}
              >
                Full Code View
              </div>
              <div
                onClick={() => setActiveView("text")}
                className={`px-4 py-2 cursor-pointer text-sm ${
                  activeView === "text"
                    ? "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0"
                    : "text-gray-600"
                }`}
              >
                Full Text View
              </div>
              <div
                onClick={() => setActiveView("section")}
                className={`px-4 py-2 cursor-pointer text-sm ${
                  activeView === "section"
                    ? "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0"
                    : "text-gray-600"
                }`}
              >
                Section View
              </div>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-hidden">
            {activeView === "code" && (
              <div className="h-full w-full">
                <MonacoEditorPanel
                  value={latexContent}
                  onChange={handleLatexChange}
                  monacoEditorRef={monacoEditorRef}
                  handleLatexChange={handleLatexChange}
                />
              </div>
            )}

            {activeView === "text" && (
              <div className="h-full w-full">
                <RichTextEditorPanel
                  value={richTextContent}
                  onChange={handleRichTextChange}
                  quillModules={quillModules}
                  compilationStatus={compilationStatus}
                  compilationMessage={compilationMessage}
                  pdfUrl={pdfUrl}
                />
              </div>
            )}

            {activeView === "section" && (
              <div className="h-full w-full overflow-y-auto bg-white">
                <SectionEditor />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-1/2 flex flex-col bg-[#F9F9F9]">
          <div className="px-4 py-3 border-b border-[#CFCFCF] bg-white">
            <span className="text-sm font-medium text-gray-700">Preview</span>
          </div>
          <div className="flex-1"></div>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
