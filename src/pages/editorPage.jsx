import React, {
  useEffect,
  useContext,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import MonacoEditorPanel from "../components/monacoEditor";
import RichTextEditorPanel from "../components/textEditor";
import SectionEditor from "../components/sectionEditor.jsx";
import LeaveSession from "../components/LeaveSession.jsx";
import { compileDocument } from "../api/projectHandling";
import AIChatPanel from "../components/aiChatPanel.jsx";
import TableDesignerModal from "../components/TableDesignerModal";
import ImageInsertModal from "../components/ImageInsertModal";
import GoBack from "../assets/icons/goBack.svg?react";
import FileIcon from "../assets/icons/file.svg?react";
import "react-quill-new/dist/quill.snow.css";
import "../App.css";
import {
  extractLatexBody,
  reconstructLatexDocument,
  latexToRichText,
  richTextToLatex,
  latexToSections,
  sectionsToLatex,
  sectionToRichText,
  richTextToSection,
  splitLatex,
} from "../utils/latexUtility.jsx";
import {
  loadProjects,
  loadProject,
  saveProject,
  loadProjectFromServer,
} from "../api/projectHandling.jsx";
import { projectContext } from "../context/useProject.jsx";
import PdfViewer from "../components/pdfViewer.jsx";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth.jsx";
import { useSettings } from "../context/useSettings";
import axios from "axios";

const EditorPage = () => {
  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const { isSectionSpaceOpen, isAIChatOpen, setIsAIChatOpen } =
    useOutletContext();
  const [searchParams] = useSearchParams();
  const [remoteProject, setRemoteProject] = useState(null);
  const effectiveProjectDetails = remoteProject || projectDetails;
  const [collaborationToken, setCollaborationToken] = useState(null);
  const { user, isServerConnected, isAuthenticated } = useAuth();
  const { settings } = useSettings();

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
  const [showAIChat, setShowAIChat] = useState(false);
  const [sections, setSections] = useState([]);
  const [logs, setLogs] = useState([]);

  const [debugLogs, setDebugLogs] = useState([]);
  const [docPreamble, setDocPreamble] = useState("");

  const [syncTexLine, setSyncTexLine] = useState(null);

  // Table and Image modal state for main Monaco editor
  const [showTableModal, setShowTableModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingTableData, setEditingTableData] = useState(null);
  const [editingImageData, setEditingImageData] = useState(null);
  const [editingRange, setEditingRange] = useState(null);

  // View Notice State
  const [showTextViewNotice, setShowTextViewNotice] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const {
    currentProject,
    activeFile,
    isCompiling,
    compilationStatus,
    compilationMessage,
    pdfUrl,
    latexContent,
  } = projectDetails;

  // 2. Add helper function to log messages:
  const addDebugLog = (message, type = "info", details = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [
      ...prev.slice(-50),
      { timestamp, message, type, details },
    ]); // Keep last 50 logs
  };

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

  useEffect(() => {
    if (effectiveProjectDetails.latexContent) {
      const { preamble } = splitLatex(effectiveProjectDetails.latexContent);
      setDocPreamble(preamble);
    }
  }, [effectiveProjectDetails.latexContent]);

  // Handle AI Chat open from sidebar
  useEffect(() => {
    if (isAIChatOpen) {
      setShowAIChat(true);
      setIsAIChatOpen(false); // Reset so it can be triggered again
    }
  }, [isAIChatOpen, setIsAIChatOpen]);

  //Load Project
  useEffect(() => {
    console.log("🔍 EditorPage effect triggered");
    const projectIdFromUrl = searchParams.get("project");
    console.log("Project ID from URL:", projectIdFromUrl);

    if (projectIdFromUrl) {
      // Check if this is a remote project (identified by having a server URL stored)
      const serverUrl = localStorage.getItem(
        `project_${projectIdFromUrl}_server`,
      );

      if (serverUrl) {
        console.log("📥 Loading REMOTE project...");
        updateProjectDetails({ isLoading: true });
        loadRemoteProject(projectIdFromUrl);
      } else {
        console.log("📂 Loading LOCAL project...");

        // Inline local loading logic
        const loadLocal = async () => {
          updateProjectDetails({ isLoading: true });
          const { CurrentProject, ActiveFile, Error } =
            await loadProject(projectIdFromUrl);

          if (Error) {
            updateProjectDetails({
              error: Error,
              isLoading: false,
            });
          } else {
            updateProjectDetails({
              currentProject: CurrentProject,
              activeFile: ActiveFile,
              isLoading: false,
            });
            // Load the list of projects in background so the sidebar works
            const { Projects } = await loadProjects();
            updateProjectDetails({ project: Projects });
          }
        };
        loadLocal();
      }
    } else {
      console.log("📂 Loading LOCAL projects list...");
      fetchData();
    }
  }, [searchParams]);

  const loadRemoteProject = async (projectId) => {
    console.log("loadRemoteProject called with:", projectId);

    const serverUrl = localStorage.getItem(`project_${projectId}_server`);
    console.log("Server URL from localStorage:", serverUrl);

    if (!serverUrl) {
      console.error("No server URL found");
      updateProjectDetails({
        error: "Server URL not found. Please rejoin the project.",
        isLoading: false,
      });
      return;
    }

    // Keep loading state true while fetching
    updateProjectDetails({ isLoading: true });

    try {
      console.log(
        "Fetching project from:",
        `${serverUrl}/api/projects/${projectId}`,
      );

      const { project, error } = await loadProjectFromServer(
        projectId,
        serverUrl,
      );

      console.log("Load result:", { project, error });

      if (error) {
        updateProjectDetails({
          error,
          isLoading: false,
          currentProject: null,
        });
        return;
      }

      console.log("Project data received:", project);

      updateProjectDetails({
        currentProject: project,
        activeFile: project.activeFile || "main.tex",
        latexContent:
          project.files[project.activeFile || "main.tex"]?.content || "",
        isLoading: false, // NOW set to false
        isRemoteProject: true,
        serverUrl: serverUrl,
      });

      setRemoteProject({
        currentProject: project,
        activeFile: project.activeFile || "main.tex",
        latexContent:
          project.files[project.activeFile || "main.tex"]?.content || "",
        isLoading: false,
        isRemoteProject: true,
        serverUrl,
      });

      const effectiveProjectDetails = remoteProject || projectDetails;

      console.log("✓ Remote project loaded successfully");
    } catch (error) {
      console.error("Error in loadRemoteProject:", error);
      updateProjectDetails({
        error: "Failed to load project from server",
        isLoading: false,
        currentProject: null,
      });
    }
  };

  useEffect(() => {
    const fetchCollabToken = async () => {
      const projectId = effectiveProjectDetails.currentProject?.id;
      if (!projectId) return;

      // Check if we already have a guest token (for collaborators)
      const guestToken = localStorage.getItem(
        `project_${projectId}_guest_token`,
      );
      if (guestToken) {
        console.log("✓ Using existing guest token");
        setCollaborationToken(guestToken);
        return;
      }

      // Owner/authenticated user - fetch collaboration token
      try {
        const apiBase =
          effectiveProjectDetails.serverUrl || "http://localhost:5025";
        const response = await axios.post(
          `
          ${apiBase}/api/projects/${projectId}/get-collab-token`,
          {},
          { withCredentials: true }, // Sends httpOnly cookie
        );

        const token = response.data.collaborationToken;
        console.log("✓ Got collaboration token for owner");
        setCollaborationToken(token);

        // Store temporarily (will expire)
        localStorage.setItem(`project_${projectId}_collab_token`, token);
      } catch (error) {
        console.error("Failed to get collaboration token:", error);
      }
    };

    if (effectiveProjectDetails.currentProject) {
      fetchCollabToken();
    }
  }, [effectiveProjectDetails.currentProject?.id]);

  //FIXME: The code seems useless to me - Clint
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

  // const token = document.cookie
  //   .split("; ")
  //   .find((row) => row.startsWith("uid="))
  //   ?.split("=")[1];

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
        const extractedSections = latexToSections(latexDoc, projectDetails.currentProject.files);

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

  // Reset on project change or file change
  useEffect(() => {
    sectionsInitialized.current = false;
    lastSyncedLatex.current = "";
  }, [projectDetails.currentProject?.id, projectDetails.activeFile]);

  // Auto-compile when project finishes loading
  useEffect(() => {
    if (
      projectDetails.currentProject?.id &&
      !projectDetails.isLoading
    ) {
      handleCompile();
    }
  }, [projectDetails.currentProject?.id]);

  useEffect(() => {
    if (projectDetails.compilationMessage) {
      setLogs((prev) => [
        ...prev,
        `${projectDetails.compilationStatus} : ${projectDetails.compilationMessage}`,
      ]);
    }
  }, [projectDetails.compilationStatus, projectDetails.compilationMessage]);

  // ============ ACTIVE FILE FILTERING ============
  // Filter sections for the currently active file
  const activeSections = useMemo(() => {
    if (!sections || sections.length === 0) return [];
    const af = projectDetails.activeFile || "main.tex";

    // main.tex → show everything
    if (af === "main.tex") return sections;

    // Sub-file → find sections that belong to this file
    return sections.filter(
      (s) => s.contentFileName === af || (s.source === "file" && s.fileName === af)
    );
  }, [sections, projectDetails.activeFile]);

  // Derive rich text from the active sections
  const activeRichText = useMemo(() => {
    if (!activeSections || activeSections.length === 0) return "";
    const af = projectDetails.activeFile || "main.tex";

    // main.tex → use the standard richTextContent
    if (af === "main.tex") return projectDetails.richTextContent || "";

    // Sub-file → build rich text from active sections
    return activeSections
      .map((s) => sectionToRichText(s))
      .join("\n");
  }, [activeSections, projectDetails.activeFile, projectDetails.richTextContent]);

  // Determine file type for preview rendering
  const activeFileType = useMemo(() => {
    const af = projectDetails.activeFile || "main.tex";
    const ext = af.split(".").pop().toLowerCase();
    if (["tex", "bib"].includes(ext)) return "tex";
    if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    return "readonly"; // cls, sty, txt, etc.
  }, [projectDetails.activeFile]);

  // ============ UNIFIED UPDATE HANDLER ============

  // const updateAllEditors = useCallback(
  //   (source, content) => {
  //     if (updateTimeout.current) {
  //       clearTimeout(updateTimeout.current);
  //     }

  //     updateTimeout.current = setTimeout(
  //       () => {
  //         let newLatexContent;

  //         switch (source) {
  //           case "monaco":
  //             newLatexContent = content;
  //             break;

  //           case "richText":
  //             const bodyContent = richTextToLatex(content);
  //             newLatexContent = reconstructLatexDocument(
  //               projectDetails.latexContent || lastSyncedLatex.current,
  //               bodyContent
  //             );
  //             break;

  //           case "sections":
  //             newLatexContent = sectionsToLatex(
  //               content,
  //               projectDetails.latexContent || lastSyncedLatex.current
  //             );
  //             break;

  //           default:
  //             return;
  //         }

  //         if (newLatexContent === lastSyncedLatex.current) {
  //           return;
  //         }

  //         lastSyncedLatex.current = newLatexContent;

  //         const updatedProject = {
  //           ...projectDetails.currentProject,
  //           files: {
  //             ...projectDetails.currentProject.files,
  //             [projectDetails.activeFile]: {
  //               ...projectDetails.currentProject.files[
  //                 projectDetails.activeFile
  //               ],
  //               content: newLatexContent,
  //             },
  //           },
  //         };

  //         updateProjectDetails({
  //           latexContent: newLatexContent,
  //           currentProject: updatedProject,
  //         });

  //         // Update derived states for non-active editors
  //         if (source !== "richText") {
  //           const bodyContent = extractLatexBody(newLatexContent);
  //           updateProjectDetails({
  //             richTextContent: latexToRichText(bodyContent),
  //           });
  //         }

  //         if (source !== "sections") {
  //           setSections(latexToSections(newLatexContent));
  //         }

  //         if (saveTimeout.current) {
  //           clearTimeout(saveTimeout.current);
  //         }

  //         saveTimeout.current = setTimeout(() => {
  //           saveProjectToServer(updatedProject, projectDetails.activeFile);
  //         }, 1000);
  //       },
  //       source === "monaco" ? 300 : source === "richText" ? 500 : 300
  //     );
  //   },
  //   [projectDetails, updateProjectDetails]
  // );

  const updateAllEditors = useCallback(
    (source, content) => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }

      updateTimeout.current = setTimeout(
        () => {
          let newLatexContent;

          addDebugLog(`🔄 UPDATE from ${source}`, "info");

          switch (source) {
            case "monaco":
              newLatexContent = content;
              addDebugLog("✅ Monaco: Direct pass-through");
              break;

            case "richText":
              addDebugLog("🔄 Converting Rich Text → LaTeX");

              // Check what's in the rich text
              const hasPreambleMarker = content.includes("<!--LATEX_PREAMBLE:");
              const hasPostambleMarker = content.includes(
                "<!--LATEX_POSTAMBLE:",
              );
              addDebugLog(
                `Rich text markers: Preamble=${hasPreambleMarker}, Postamble=${hasPostambleMarker}`,
                hasPreambleMarker && hasPostambleMarker ? "success" : "warning",
              );

              const bodyContent = richTextToLatex(content);

              const hasBegin = bodyContent.includes("\\begin{document}");
              const hasEnd = bodyContent.includes("\\end{document}");

              addDebugLog(
                `After richTextToLatex: \\begin=${hasBegin}, \\end=${hasEnd}`,
                hasBegin && hasEnd ? "success" : "error",
                `Length: ${bodyContent.length} chars`,
              );

              newLatexContent = reconstructLatexDocument(
                projectDetails.latexContent || lastSyncedLatex.current,
                bodyContent,
              );

              const finalHasBegin =
                newLatexContent.includes("\\begin{document}");
              const finalHasEnd = newLatexContent.includes("\\end{document}");

              addDebugLog(
                `Final LaTeX: \\begin=${finalHasBegin}, \\end=${finalHasEnd}`,
                finalHasBegin && finalHasEnd ? "success" : "error",
                `Length: ${newLatexContent.length} chars`,
              );
              break;

            case "sections":
              addDebugLog("🔄 Converting Sections → LaTeX");
              const result = sectionsToLatex(
                content,
              );
              newLatexContent = result.latex;

              // Write file updates back to the project
              if (Object.keys(result.fileUpdates).length > 0) {
                addDebugLog(`📁 File updates: ${Object.keys(result.fileUpdates).join(", ")}`);
              }

              // Build updated files object with file updates applied
              const updatedFiles = { ...projectDetails.currentProject.files };
              for (const [fileName, fileContent] of Object.entries(result.fileUpdates)) {
                if (updatedFiles[fileName]) {
                  updatedFiles[fileName] = {
                    ...updatedFiles[fileName],
                    content: fileContent,
                  };
                } else {
                  updatedFiles[fileName] = { content: fileContent };
                }
              }

              // Store fileUpdates so we can apply them to the project below
              // We attach this to be used when building updatedProject
              content._fileUpdates = updatedFiles;

              addDebugLog("✅ Sections conversion complete");
              break;

            default:
              addDebugLog(`⚠️ Unknown source: ${source}`, "warning");
              return;
          }

          if (newLatexContent === lastSyncedLatex.current) {
            addDebugLog("⏭️ No changes detected, skipping");
            return;
          }

          lastSyncedLatex.current = newLatexContent;

          // If sections source provided file updates, merge them into files
          const baseFiles = (source === "sections" && content._fileUpdates)
            ? content._fileUpdates
            : projectDetails.currentProject.files;

          const updatedProject = {
            ...projectDetails.currentProject,
            files: {
              ...baseFiles,
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
            addDebugLog("🔄 Updating rich text from LaTeX");
            const bodyContent = extractLatexBody(newLatexContent);
            const richText = latexToRichText(bodyContent);

            const hasPreamble = richText.includes("<!--LATEX_PREAMBLE:");
            const hasPostamble = richText.includes("<!--LATEX_POSTAMBLE:");

            addDebugLog(
              `Rich text generated: Preamble=${hasPreamble}, Postamble=${hasPostamble}`,
              hasPreamble && hasPostamble ? "success" : "warning",
            );

            updateProjectDetails({
              richTextContent: richText,
            });
          }

          if (source !== "sections") {
            addDebugLog("🔄 Updating sections from LaTeX");
            setSections(latexToSections(newLatexContent, updatedProject.files));
          }

          if (saveTimeout.current) {
            clearTimeout(saveTimeout.current);
          }

          saveTimeout.current = setTimeout(() => {
            addDebugLog("💾 Auto-saving to server");
            saveProjectToServer(updatedProject, projectDetails.activeFile);
          }, 1000);

          addDebugLog("✅ Update complete", "success");
        },
        source === "monaco" ? 300 : source === "richText" ? 500 : 300,
      );
    },
    [projectDetails, updateProjectDetails],
  );

  // ============ EDITOR HANDLERS ============

  const handleLatexChange = useCallback(
    (value) => {
      setActiveEditor("monaco");
      updateProjectDetails({ latexContent: value });
      updateAllEditors("monaco", value);
    },
    [updateAllEditors],
  );

  const handleRichTextChange = useCallback(
    (value) => {
      setActiveEditor("richText");
      const af = projectDetails.activeFile || "main.tex";

      if (af === "main.tex") {
        // Main file: standard flow
        updateProjectDetails({ richTextContent: value });
        updateAllEditors("richText", value);
      } else {
        // Sub-file: convert rich text back to section content and merge
        // Use richTextToSection on each active section
        const updatedActiveSections = activeSections.map((s) => ({
          ...s,
          content: richTextToSection(value, s),
        }));

        // Merge back into master sections
        const updatedMap = new Map(updatedActiveSections.map((s) => [s.id, s]));
        const mergedSections = sections.map((s) =>
          updatedMap.has(s.id) ? updatedMap.get(s.id) : s
        );
        setSections(mergedSections);
        updateAllEditors("sections", mergedSections);
      }
    },
    [updateAllEditors, projectDetails.activeFile, activeSections, sections],
  );

  const handleSectionsChange = useCallback(
    (updatedSections) => {
      setActiveEditor("sections");
      const af = projectDetails.activeFile || "main.tex";

      if (af === "main.tex") {
        // Main file: direct update (all sections)
        setSections([...updatedSections]);
        updateAllEditors("sections", updatedSections);
      } else {
        // Sub-file: merge filtered edits back into master sections
        const updatedMap = new Map(updatedSections.map((s) => [s.id, s]));
        const mergedSections = sections.map((s) =>
          updatedMap.has(s.id) ? updatedMap.get(s.id) : s
        );
        setSections(mergedSections);
        updateAllEditors("sections", mergedSections);
      }
    },
    [updateAllEditors, sections, projectDetails.activeFile],
  );

  const handlePdfLineJump = (lineNumber) => {
    console.log("🚀 SyncTeX Triggered in EditorPage. Line:", lineNumber);
    // 1. Set the line number to state to trigger highlighting in children
    setSyncTexLine(lineNumber);

    // Optional: You could force switch the view here if you wanted
    // if (activeView === 'text') setActiveView('code');
  };

  // Helper to clear highlight after jump is done
  const clearSyncTex = () => setSyncTexLine(null);

  //FIXME: Fix the saving strategy

  const saveProjectToServer = async (updatedProject, activeFile) => {
    if (!updatedProject || !projectDetails.activeFile) return;

    try {
      let compilationStatus = "success";
      let compilationMessage = "Project saved successfully!";

      await saveProject(
        updatedProject,
        activeFile,
        compilationStatus,
        compilationMessage,
      );
      console.log("Auto-saved to server");
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  const handleCompile = async () => {
    const response = await compileDocument(
      currentProject,
      activeFile,
      isCompiling,
      compilationStatus,
      compilationMessage,
      pdfUrl,
      latexContent,
      isServerConnected,
      isAuthenticated,
    );

    console.log("handleCompile response", response.pdfUrl);

    updateProjectDetails({
      pdfUrl: response.pdfUrl,
      compilationStatus: response.compilationStatus,
      compilationMessage: response.compilationMessage,
      pdfFileName: response.fileName,
    });
  };

  const quillModules = {
    toolbar: {
      container: [
        [{ header: [2, 3, 4, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ script: "super" }, { script: "sub" }],
        ["link", "code"],
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
    <div
      className={`flex flex-row h-screen overflow-hidden fixed inset-0 pt-7 ${
        isSectionSpaceOpen ? "ml-64" : "ml-0"
      }`}
      style={{
        background:
          settings.appearance.customThemes[settings.appearance.theme].primary,
      }}
    >
      <LeaveSession projectId={projectDetails.currentProject?.id} />
      {/* Left side of the screen */}
      <div className="flex-1 flex flex-shrink min-w-[40vw] flex-col border-r overflow-hidden ml-10 pb-[3.2vh]">
        <div
          className="flex justify-between border-b border-[#CFCFCF] flex-shrink-0 sticky top-0 z-10 items-center h-8"
          style={{
            background:
              settings.appearance.customThemes[settings.appearance.theme]
                .primary,
            borderColor:
              settings.appearance.customThemes[settings.appearance.theme]
                .border,
          }}
        >
          <div
            className="ml-2 text-[12px] font-inter text-gray-700 font-light border-2 px-2 py-[1px] rounded-lg flex"
            style={{
              color:
                settings.appearance.customThemes[settings.appearance.theme]
                  .text1,
              borderColor:
                settings.appearance.customThemes[settings.appearance.theme]
                  .border,
            }}
          >
            <FileIcon
              style={{
                fill: settings.appearance.customThemes[
                  settings.appearance.theme
                ].icon1,
              }}
              className="w-4 h-4 mr-2"
            />
            {projectDetails.activeFile}
          </div>
          {activeFileType === "tex" && (
            <select
              id="tour-view-switcher"
              className="rounded-sm ml-5 px-3 py-1 mr-2 text-[13px] text-gray-600 font-inter select-none
           focus:ring-2 focus:ring-gray-100 outline-none focus:border-transparent font-medium hover:bg-gray-100"
              value={activeView}
              onChange={(e) => {
                const newView = e.target.value;
                if (
                  newView === "text" &&
                  !localStorage.getItem("hideTextViewNotice")
                ) {
                  setShowTextViewNotice(true);
                }
                setActiveView(newView);
              }}
              style={{
                background:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .primary,
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text2,
              }}
            >
              <option value="code">Code Editor</option>
              <option value="section">Section View</option>
              <option value="text">Text View</option>
            </select>
          )}
          {activeFileType !== "tex" && (
            <span className="ml-auto mr-3 text-[11px] font-inter font-medium text-gray-400 uppercase tracking-wider">
              {activeFileType === "image" ? "Image Preview" : activeFileType === "pdf" ? "PDF Preview" : "Read Only"}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
          {/* ---- Image Preview ---- */}
          {activeFileType === "image" && (
            <div className="h-full w-full flex flex-col items-center justify-center bg-[#FAFAFA]">
              <div className="max-w-[90%] max-h-[80%] rounded-lg border border-[#CFCFCF] shadow-sm overflow-hidden bg-white">
                <img
                  src={projectDetails.currentProject?.files[projectDetails.activeFile]?.content || ""}
                  alt={projectDetails.activeFile}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              <p className="mt-3 text-[13px] text-gray-500 font-inter font-medium">
                {projectDetails.activeFile}
              </p>
            </div>
          )}

          {/* ---- PDF Preview ---- */}
          {activeFileType === "pdf" && (
            <div className="h-full w-full flex flex-col items-center justify-center bg-[#FAFAFA]">
              <embed
                src={projectDetails.currentProject?.files[projectDetails.activeFile]?.content || ""}
                type="application/pdf"
                className="w-full h-full rounded border border-[#CFCFCF]"
              />
            </div>
          )}

          {/* ---- Read-Only Viewer (cls, sty, txt, etc.) ---- */}
          {activeFileType === "readonly" && (
            <div className="h-full w-full relative">
              <div className="absolute top-2 right-4 z-10 px-2.5 py-1 rounded bg-gray-100 border border-[#CFCFCF] text-[11px] font-inter font-medium text-gray-500 uppercase tracking-wider select-none">
                Read Only
              </div>
              <MonacoEditorPanel
                key={`readonly-${projectDetails.activeFile}`}
                value={effectiveProjectDetails.latexContent || ""}
                handleLatexChange={() => {}}
                monacoEditorRef={{ current: null }}
                readOnly={true}
                projectFiles={[]}
              />
            </div>
          )}

          {/* ---- Normal Editors (tex/bib) ---- */}
          {activeFileType === "tex" && activeView === "code" && (
            <div className="h-full w-full">
              <MonacoEditorPanel
                key={projectDetails.currentProject?.id}
                value={effectiveProjectDetails.latexContent || ""}
                handleLatexChange={handleLatexChange}
                monacoEditorRef={monacoEditorRef}
                projectId={projectDetails.currentProject?.id}
                token={collaborationToken}
                isOnline={isOnline}
                user={user}
                activeEditor={activeView === "code" ? "monaco" : "other"}
                highlightLine={syncTexLine}
                onHighlightClear={clearSyncTex}
                onOpenTableModal={() => {
                  setEditingTableData(null);
                  setEditingRange(null);
                  setShowTableModal(true);
                }}
                onOpenImageModal={() => {
                  setEditingImageData(null);
                  setEditingRange(null);
                  setShowImageModal(true);
                }}
                onEditTable={(content, range) => {
                  setEditingTableData(content);
                  setEditingRange(range);
                  setShowTableModal(true);
                }}
                onEditImage={(content, range) => {
                  setEditingImageData(content);
                  setEditingRange(range);
                  setShowImageModal(true);
                }}
                projectFiles={
                  projectDetails.currentProject?.files
                    ? Object.keys(projectDetails.currentProject.files)
                    : []
                }
              />
            </div>
          )}

          {activeFileType === "tex" && activeView === "text" && (
            <div className="h-full w-full overflow-y-auto">
              <RichTextEditorPanel
                value={activeRichText}
                onChange={handleRichTextChange}
                quillModules={quillModules}
                highlightLine={syncTexLine}
                onHighlightClear={clearSyncTex}
              />
            </div>
          )}

          {activeFileType === "tex" && activeView === "section" && (
            <div className="h-full w-full overflow-y-auto">
              <SectionEditor
                sections={activeSections}
                onSectionsChange={handleSectionsChange}
                preamble={docPreamble}
                sectionToRichText={sectionToRichText}
                richTextToSection={richTextToSection}
                globalHighlightLine={syncTexLine}
                onHighlightClear={clearSyncTex}
                projectFiles={
                  projectDetails.currentProject?.files
                    ? Object.keys(projectDetails.currentProject.files)
                    : []
                }
              />
            </div>
          )}
          {/* AI Chat Panel - Persistent & Overlay */}
          <div
            className={`absolute top-0 right-0 h-full w-full z-20 shadow-xl transition-transform duration-300 ease-in-out transform bg-white border-l border-gray-200 ${
              showAIChat ? "translate-x-0" : "translate-x-full hidden"
            }`}
          >
            <AIChatPanel
              projectDetails={projectDetails}
              sections={sections}
              onApplyChanges={(newContent, fileUpdates) => {
                // If AI edited content from \input{} files, apply file updates first
                if (fileUpdates && Object.keys(fileUpdates).length > 0) {
                  const updatedFiles = { ...projectDetails.currentProject.files };
                  for (const [fileName, content] of Object.entries(fileUpdates)) {
                    if (updatedFiles[fileName]) {
                      updatedFiles[fileName] = { ...updatedFiles[fileName], content };
                    } else {
                      updatedFiles[fileName] = { name: fileName, content, type: "tex" };
                    }
                  }
                  updateProjectDetails({
                    currentProject: {
                      ...projectDetails.currentProject,
                      files: updatedFiles,
                    },
                  });
                }
                updateAllEditors("monaco", newContent);
              }}
              onClose={() => setShowAIChat(false)}
            />
          </div>
        </div>
      </div>

      {/* Right side of the screen */}
      <div
        className="flex-1 flex flex-shrink min-w-[40vw] flex-col border-r overflow-hidden"
        style={{
          borderColor:
            settings.appearance.customThemes[settings.appearance.theme].border,
        }}
      >
        {activeRightView === "preview" && (
          <div className="flex-1 overflow-hidden relative">
            <PdfViewer
              pdfUrl={projectDetails.pdfUrl}
              pdfFileName={projectDetails.pdfFileName}
              onLineJump={handlePdfLineJump}
              onCompile={handleCompile}
              fileTitle={projectDetails.currentProject.title}
              onShowLogs={() => setActiveRightView("logs")}
              projectDetails={projectDetails}
            />
          </div>
        )}

        {activeRightView === "logs" && (
          <div className="flex-1 overflow-y-auto bg-[#FAFAFA]">
            <button
              onClick={() => setActiveRightView("preview")}
              className="font-inter w-32 ml-4 pl-3 pb-1 mt-1 pt-1 mb-1 rounded-full text-sm hover:bg-gray-100 sticky text-gray-800 flex cursor-pointer font-medium h-6"
            >
              <GoBack style={{ fill: "#0a0a0a" }} className="w-5 h-5 mr-4" />
              Go Back
            </button>
            <hr />
            <div className="px-10 py-4 font-inter text-sm">
              {logs.map((log, i) => (
                <div key={i} className="mb-1 border-b border-gray-100 pb-1">
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-400 italic">No logs available.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table Designer Modal for main Monaco editor */}
      <TableDesignerModal
        isOpen={showTableModal}
        onClose={() => {
          setShowTableModal(false);
          setEditingTableData(null);
          setEditingRange(null);
        }}
        initialData={editingTableData}
        onInsert={(latex) => {
          if (monacoEditorRef.current) {
            if (editingRange) {
              monacoEditorRef.current.replaceRange(editingRange, latex);
            } else if (monacoEditorRef.current.insertAtCursor) {
              monacoEditorRef.current.insertAtCursor(latex);
            }
          }
        }}
      />

      {/* Image Insert Modal for main Monaco editor */}
      <ImageInsertModal
        isOpen={showImageModal}
        onClose={() => {
          setShowImageModal(false);
          setEditingImageData(null);
          setEditingRange(null);
        }}
        initialData={editingImageData}
        projectFiles={
          projectDetails.currentProject?.files
            ? Object.keys(projectDetails.currentProject.files).filter((f) =>
                /\.(png|jpg|jpeg|pdf|eps|svg)$/i.test(f),
              )
            : []
        }
        onInsert={(latex) => {
          if (monacoEditorRef.current) {
            if (editingRange) {
              monacoEditorRef.current.replaceRange(editingRange, latex);
            } else if (monacoEditorRef.current.insertAtCursor) {
              monacoEditorRef.current.insertAtCursor(latex);
            }
          }
        }}
      />
      {/* Text View Usage Notice Modal */}
      {showTextViewNotice && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[10000] backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100 transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileIcon style={{ fill: "#0a0a0a" }} className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 font-inter">
                Editor Note
              </h3>
              <p className="text-gray-500 mb-8 text-sm leading-relaxed px-2 font-inter">
                Text editor will only and only be used to text content related
                work, any other customizations needs to be done via{" "}
                <span className="font-semibold text-gray-800 underline underline-offset-4">
                  code editor
                </span>
                .
              </p>
            </div>

            <div className="flex flex-col space-y-4">
              <button
                onClick={() => {
                  if (dontShowAgain) {
                    localStorage.setItem("hideTextViewNotice", "true");
                  }
                  setShowTextViewNotice(false);
                }}
                className="w-full bg-[#0a0a0a] text-white py-3 rounded-xl hover:bg-gray-800 transition-all font-medium text-sm shadow-lg shadow-black/10 active:scale-[0.98]"
              >
                Got it
              </button>

              <label className="flex items-center justify-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black transition-all"
                />
                <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors font-inter">
                  Don't show this message again
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPage;
