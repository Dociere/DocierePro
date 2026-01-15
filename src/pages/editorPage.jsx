import React, {
  useEffect,
  useContext,
  useRef,
  useState,
  useCallback,
} from "react";
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
  latexToSections,
  sectionsToLatex,
} from "../utils/latexUtility.jsx";
import { loadProjects, saveProject } from "../api/projectHandling.jsx";
import { projectContext } from "../context/useProject.jsx";
import PdfViewer from "../components/pdfViewer.jsx";

const API_URL = "http://localhost:5000";

const EditorPage = ({ isSectionSpaceOpen, setIsSectionSpaceOpen }) => {
  const { projectDetails, updateProjectDetails } = useContext(projectContext);

  // Track which editor is actively being edited
  const [activeEditor, setActiveEditor] = useState(null);

  // Refs
  const monacoEditorRef = useRef(null);
  const updateTimeout = useRef(null);
  const saveTimeout = useRef(null);
  const lastSyncedLatex = useRef("");
  const sectionsInitialized = useRef(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [activeView, setActiveView] = useState("code");
  const [activeRightView, setActiveRightView] = useState("preview");
  const [sections, setSections] = useState([]);
  const [logs, setLogs] = useState([]);

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
  };

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

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("uid="))
    ?.split("=")[1];

  useEffect(() => {
    if (
      projectDetails.currentProject &&
      projectDetails.activeFile &&
      projectDetails.currentProject.files[projectDetails.activeFile] &&
      !sectionsInitialized.current
    ) {
      const latexDoc =
        projectDetails.currentProject.files[projectDetails.activeFile].content;

      if (
        latexDoc &&
        latexDoc.includes("\\begin{document}") &&
        latexDoc.includes("\\end{document}")
      ) {
        lastSyncedLatex.current = latexDoc;

        const bodyContent = extractLatexBody(latexDoc);
        const extractedSections = latexToSections(latexDoc);

        // Only set sections if they're actually different
        setSections((prevSections) => {
          if (prevSections.length === 0 || !sectionsInitialized.current) {
            return extractedSections;
          }
          return prevSections;
        });

        updateProjectDetails({
          latexContent: latexDoc,
          richTextContent: latexToRichText(bodyContent),
        });

        sectionsInitialized.current = true;
      }
    }
  }, [projectDetails.currentProject, projectDetails.activeFile]);

  // Update latexContent in context when file changes
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

  // Reset on project change
  useEffect(() => {
    sectionsInitialized.current = false;
    lastSyncedLatex.current = "";
  }, [projectDetails.currentProject?.id]);

  useEffect(() => {
    if (projectDetails.compilationMessage) {
      setLogs((prev) => [
        ...prev,
        `${projectDetails.compilationStatus} : ${projectDetails.compilationMessage}`,
      ]);
    }
  }, [projectDetails.compilationStatus, projectDetails.compilationMessage]);

  // ============ UNIFIED UPDATE HANDLER ============

  const updateAllEditors = useCallback(
    (source, content) => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }

      updateTimeout.current = setTimeout(
        () => {
          let newLatexContent;

          switch (source) {
            case "monaco":
              newLatexContent = content;
              break;

            case "richText":
              const bodyContent = richTextToLatex(content);
              newLatexContent = reconstructLatexDocument(
                projectDetails.latexContent || lastSyncedLatex.current,
                bodyContent
              );
              break;

            case "sections":
              newLatexContent = sectionsToLatex(
                content,
                projectDetails.latexContent || lastSyncedLatex.current
              );
              break;

            default:
              return;
          }

          if (newLatexContent === lastSyncedLatex.current) {
            return;
          }

          lastSyncedLatex.current = newLatexContent;

          const updatedProject = {
            ...projectDetails.currentProject,
            files: {
              ...projectDetails.currentProject.files,
              [projectDetails.activeFile]: {
                ...projectDetails.currentProject.files[
                  projectDetails.activeFile
                ],
                content: newLatexContent,
              },
            },
          };

          updateProjectDetails({
            latexContent: newLatexContent,
            currentProject: updatedProject,
          });

          // Update derived states for non-active editors
          if (source !== "richText") {
            const bodyContent = extractLatexBody(newLatexContent);
            updateProjectDetails({
              richTextContent: latexToRichText(bodyContent),
            });
          }

          if (source !== "sections") {
            setSections(latexToSections(newLatexContent));
          }

          if (saveTimeout.current) {
            clearTimeout(saveTimeout.current);
          }

          saveTimeout.current = setTimeout(() => {
            saveProjectToServer(updatedProject, projectDetails.activeFile);
          }, 1000);
        },
        source === "monaco" ? 300 : source === "richText" ? 500 : 300
      );
    },
    [projectDetails, updateProjectDetails]
  );

  // ============ EDITOR HANDLERS ============

  const handleLatexChange = useCallback(
    (value) => {
      setActiveEditor("monaco");
      updateProjectDetails({ latexContent: value });
      updateAllEditors("monaco", value);
    },
    [updateAllEditors]
  );

  const handleRichTextChange = useCallback(
    (value) => {
      setActiveEditor("richText");
      updateProjectDetails({ richTextContent: value });
      updateAllEditors("richText", value);
    },
    [updateAllEditors]
  );

  const handleSectionsChange = useCallback(
    (updatedSections) => {
      setActiveEditor("sections");
      setSections([...updatedSections]);
      updateAllEditors("sections", updatedSections);
    },
    [updateAllEditors]
  );

  const saveProjectToServer = async (updatedProject, activeFile) => {
    if (!updatedProject || !projectDetails.activeFile) return;

    try {
      let compilationStatus = "success";
      let compilationMessage = "Project saved successfully!";

      await saveProject(
        updatedProject,
        activeFile,
        compilationStatus,
        compilationMessage
      );
      console.log("Auto-saved to server");
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  //updatedProject, projectDetails.activeFile

  const quillModules = {
    toolbar: {
      container: [
        [{ header: [2, 3, 4, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ indent: "-1" }, { indent: "+1" }],
        ["blockquote", "code-block"],
        ["link"],
        ["clean"],
      ],
    },
    clipboard: {
      matchVisual: false,
    },
  };

  useEffect(() => {
    return () => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  if (projectDetails.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!projectDetails.currentProject) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">
          No project loaded. Please create or open a project.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-row h-screen overflow-hidden fixed inset-0 pt-11">
      {/* Left side of the screen */}
      <div className="flex-1 flex flex-col border-r border-[#CFCFCF] overflow-hidden ml-12">
        <div className="border-b border-[#CFCFCF] bg-white flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center">
            <button
              onClick={() => setActiveView("code")}
              className={`py-2 cursor-pointer flex-1 text-sm ${
                activeView === "code"
                  ? "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Full Code View
            </button>
            <button
              onClick={() => setActiveView("text")}
              className={`py-2 cursor-pointer flex-1 text-sm ${
                activeView === "text"
                  ? "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Full Text View
            </button>
            <button
              onClick={() => setActiveView("section")}
              className={`py-2 cursor-pointer flex-1 text-sm ${
                activeView === "section"
                  ? "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Section View
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeView === "code" && (
            <div className="h-full w-full">
              <MonacoEditorPanel
                value={projectDetails.latexContent || ""}
                handleLatexChange={handleLatexChange}
                monacoEditorRef={monacoEditorRef}
                projectId={projectDetails.currentProject?.id}
                token={token}
                isOnline={isOnline}
              />
            </div>
          )}

          {activeView === "text" && (
            <div className="h-full w-full overflow-y-auto">
              <RichTextEditorPanel
                value={projectDetails.richTextContent || ""}
                onChange={handleRichTextChange}
                quillModules={quillModules}
              />
            </div>
          )}

          {activeView === "section" && (
            <div className="h-full w-full overflow-y-auto">
              <SectionEditor
                sections={sections}
                onSectionsChange={handleSectionsChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right side of the screen */}
      <div className="flex-1 flex flex-col border-r border-[#CFCFCF] overflow-hidden">
        <div className="border-b border-[#CFCFCF] bg-white flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveRightView("preview")}
              className={`py-2 cursor-pointer flex-1 text-sm ${
                activeRightView === "preview"
                  ? "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveRightView("logs")}
              className={`py-2 cursor-pointer flex-1 text-sm ${
                activeRightView === "logs"
                  ? "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Logs
            </button>
            {/* <button
                onClick={() => setActiveRightView("aichat")}
                className={`py-2 cursor-pointer flex-1 text-sm ${
                  activeRightView === "aichat"
                    ? "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Chat Window
              </button> */}
          </div>
        </div>

        {activeRightView === "preview" && (
          <div className="flex-1 overflow-hidden relative">
            <PdfViewer pdfUrl={projectDetails.pdfUrl} />
          </div>
        )}

        {activeRightView === "logs" && (
          <div className="flex-1 overflow-y-auto px-10 py-4 font-mono">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPage;
