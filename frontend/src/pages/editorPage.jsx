import React, { useEffect, useContext, useRef } from "react";
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
import { loadProjects } from "../api/projectHandling.jsx";
import { projectContext } from "../context/useProject.jsx";

// const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const API_URL = "http://localhost:5000";

const EditorPage = () => {
  const { projectDetails, updateProjectDetails } = useContext(projectContext);

  // Sync control
  const isUpdatingFromLatex = useRef(false);
  const isUpdatingFromRichText = useRef(false);
  const updateTimeout = useRef(null);
  const monacoEditorRef = useRef(null);

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
        <div className="h-[calc(100vh-4rem)] w-full ">
          <div className="flex flex-row h-full">
            <MonacoEditorPanel
              value={projectDetails.latexContent}
              onChange={handleLatexChange}
              monacoEditorRef={monacoEditorRef}
              handleLatexChange={handleLatexChange}
            />

            <RichTextEditorPanel
              value={projectDetails.richTextContent}
              onChange={handleRichTextChange}
              quillModules={quillModules}
              compilationStatus={projectDetails.compilationStatus}
              compilationMessage={projectDetails.compilationMessage}
              pdfUrl={projectDetails.pdfUrl}
            />
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
