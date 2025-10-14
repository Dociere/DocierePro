import React, { useEffect, useContext, useRef, useState } from "react";
import MonacoEditorPanel from "../components/monacoEditor";
import RichTextEditorPanel from "../components/textEditor";
import SectionEditor from "../components/sectionEditor.jsx";
import "react-quill-new/dist/quill.snow.css";
import axios from "axios";
import "../App.css";
import {
  extractLatexBody,
  reconstructLatexDocument,
  latexToRichText,
  richTextToLatex,
} from "../utils/latexUtility.jsx";
import { loadProjects } from "../api/projectHandling.jsx";
import { projectContext } from "../context/useProject.jsx";

// const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const API_URL = "http://localhost:5000";

const EditorPage = ({ isSectionSpaceOpen, setIsSectionSpaceOpen }) => {
  const { projectDetails, updateProjectDetails } = useContext(projectContext);

  // Sync control
  const isUpdatingFromLatex = useRef(false);
  const isUpdatingFromRichText = useRef(false);
  const updateTimeout = useRef(null);
  const monacoEditorRef = useRef(null);
  const [activeView, setActiveView] = useState("code");

  useEffect(() => {
    fetchData();
    checkServerHealth();
  }, []);

  const fetchData = async () => {
    const { Projects, Loading, CurrentProject, ActiveFile } =
      await loadProjects();
    updateProjectDetails({
      project: Projects,
      currentProject: CurrentProject,
      activeFile: ActiveFile,
      isLoading: Loading,
    });
    checkServerHealth();
  };

  // Update Rich Text when LaTeX changes (WITH VALIDATION)
  useEffect(() => {
    if (
      projectDetails.currentProject &&
      projectDetails.activeFile &&
      projectDetails.currentProject.files[projectDetails.activeFile] &&
      !isUpdatingFromRichText.current
    ) {
      isUpdatingFromLatex.current = true;

      const latexDoc =
        projectDetails.currentProject.files[projectDetails.activeFile].content;

      // Validate LaTeX document structure
      if (
        latexDoc.includes("\\begin{document}") &&
        latexDoc.includes("\\end{document}")
      ) {
        const bodyContent = extractLatexBody(latexDoc);
        const richTextHtml = latexToRichText(bodyContent);
        updateProjectDetails({ richTextContent: richTextHtml });
      } else {
        console.warn("Invalid LaTeX document structure detected");
      }

      setTimeout(() => {
        isUpdatingFromLatex.current = false;
      }, 100);
    }
  }, [projectDetails.currentProject, projectDetails.activeFile]);

  // Update local LaTeX content when project changes
  useEffect(() => {
    if (
      projectDetails.currentProject &&
      projectDetails.activeFile &&
      projectDetails.currentProject.files[projectDetails.activeFile]
    ) {
      updateProjectDetails({
        latexContent:
          projectDetails.currentProject.files[projectDetails.activeFile]
            .content,
      });
    }
  }, [projectDetails.currentProject, projectDetails.activeFile]);

  // API functions
  const checkServerHealth = async () => {
    try {
      await axios.get(`${API_URL}/api/health`);
    } catch (error) {
      updateProjectDetails({
        error:
          "Cannot connect to server. Please make sure the backend is running.",
      });
    }
  };

  // Handle Monaco Editor changes (FIXED - No cursor jumping)
  const handleLatexChange = (value) => {
    if (
      projectDetails.currentProject &&
      projectDetails.activeFile &&
      !isUpdatingFromLatex.current
    ) {
      updateProjectDetails({
        latexContent: value,
      });

      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }

      updateTimeout.current = setTimeout(() => {
        updateProjectDetails({
          currentProject: {
            ...projectDetails.currentProject,
            files: {
              ...projectDetails.currentProject.files,
              [projectDetails.activeFile]: {
                ...projectDetails.currentProject.files[
                  projectDetails.activeFile
                ],
                content: value,
              },
            },
          },
        });
      }, 300);
    }
  };

  // Handle Rich Text Editor changes (FIXED)
  const handleRichTextChange = (value) => {
    if (
      projectDetails.currentProject &&
      projectDetails.activeFile &&
      !isUpdatingFromLatex.current
    ) {
      updateProjectDetails({ richTextContent: value });

      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }

      updateTimeout.current = setTimeout(() => {
        isUpdatingFromRichText.current = true;

        const newBodyContent = richTextToLatex(value);
        const originalLatex = projectDetails.latexContent;
        const newLatexDocument = reconstructLatexDocument(
          originalLatex,
          newBodyContent
        );

        if (
          newLatexDocument.includes("\\begin{document}") &&
          newLatexDocument.includes("\\end{document}")
        ) {
          updateProjectDetails({
            latexContent: newLatexDocument,
            currentProject: {
              ...projectDetails.currentProject,
              files: {
                ...projectDetails.currentProject.files,
                [projectDetails.activeFile]: {
                  ...projectDetails.currentProject.files[
                    projectDetails.activeFile
                  ],
                  content: newLatexDocument,
                },
              },
            },
          });
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

  if (projectDetails.isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="overleaf-container">
      <div className="overleaf-main">
        <div className="h-[calc(100vh-4rem)] w-full flex flex-row">
          {/* Left Panel - Editor with Tabs */}
          <div className="flex-1 flex flex-col ml-16 border-r border-[#CFCFCF]">
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
                    value={projectDetails.latexContent}
                    onChange={handleLatexChange}
                    monacoEditorRef={monacoEditorRef}
                    handleLatexChange={handleLatexChange}
                  />
                </div>
              )}

              {activeView === "text" && (
                <div className="h-full w-full">
                  <RichTextEditorPanel
                    value={projectDetails.richTextContent}
                    onChange={handleRichTextChange}
                    quillModules={quillModules}
                    compilationStatus={projectDetails.compilationStatus}
                    compilationMessage={projectDetails.compilationMessage}
                    pdfUrl={projectDetails.pdfUrl}
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
            <div className="flex-1">
              {/* Add your preview content here, such as a live preview or a PDF viewer */}
            </div>
          </div>
        </div>
      </div>

      {projectDetails.error && (
        <div className="error-message">
          <strong>Error:</strong> {projectDetails.error}
          <button
            style={{
              float: "right",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => updateProjectDetails({ error: "" })}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default EditorPage;
