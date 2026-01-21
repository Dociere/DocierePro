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
import LeaveSession from "../components/LeaveSession.jsx";
import "react-quill-new/dist/quill.snow.css";
import "../App.css";
import {
  extractLatexBody,
  reconstructLatexDocument,
  latexToRichText,
  richTextToLatex,
  latexToSections,
  sectionsToLatex,
} from "../utils/latexUtility.jsx";
import {
  saveDraft as saveToPouchDB,
  getDraft
} from "../utils/db";
import {
  loadProjects,
  saveProject,
  loadProjectFromServer,
} from "../api/projectHandling.jsx";
import { projectContext } from "../context/useProject.jsx";
import PdfViewer from "../components/pdfViewer.jsx";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth.jsx";
import axios from "axios";
import { useSettings } from "../context/useSettings";

// const API_URL = "http://localhost:5025";

const EditorPage = () => {
  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const { isSectionSpaceOpen } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [remoteProject, setRemoteProject] = useState(null);
  const effectiveProjectDetails = remoteProject || projectDetails;
  const [collaborationToken, setCollaborationToken] = useState(null);
  const { user } = useAuth();
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";

  // Track which editor is actively being edited
  const [activeEditor, setActiveEditor] = useState(null);

  // Refs
  const monacoEditorRef = useRef(null);
  const updateTimeout = useRef(null);
  const saveTimeout = useRef(null);
  const pouchSaveTimeout = useRef(null);
  const lastSyncedLatex = useRef("");
  const sectionsInitialized = useRef(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [activeView, setActiveView] = useState("code");
  const [activeRightView, setActiveRightView] = useState("preview");
  const [sections, setSections] = useState([]);
  const [logs, setLogs] = useState([]);

  const [debugLogs, setDebugLogs] = useState([]);

  // 2. Add helper function to log messages:
  const addDebugLog = (message, type = "info", details = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [
      ...prev.slice(-50),
      { timestamp, message, type, details },
    ]); // Keep last 50 logs
  };

  // useEffect(() => {
  //   fetchData();
  //   // checkServerHealth();
  // }, []);

  const fetchData = async () => {
    const { Projects, Loading, CurrentProject, ActiveFile } =
      await loadProjects();

    let finalLatex = CurrentProject?.files[ActiveFile || "main.tex"]?.content || "";
    if (CurrentProject?.id) {
      try {
        const localDraft = await getDraft(CurrentProject.id);
        if (localDraft && localDraft.content) {
          finalLatex = localDraft.content;
        }
      } catch (e) {
        console.warn("Error loading default draft:", e);
      }
    }

    updateProjectDetails({
      project: Projects,
      currentProject: CurrentProject,
      activeFile: ActiveFile,
      latexContent: finalLatex,
      isLoading: Loading,
    });
  };

  // const checkServerHealth = async () => {
  //   try {
  //     await axios.get(`${API_URL}/api/health`);
  //   } catch (error) {
  //     updateProjectDetails({
  //       error:
  //         "Cannot connect to server. Please make sure the backend is running.",
  //     });
  //   }
  // };

  useEffect(() => {
    console.log("🔍 EditorPage effect triggered");
    const projectIdFromUrl = searchParams.get("project");
    console.log("Project ID from URL:", projectIdFromUrl);

    if (projectIdFromUrl) {
      const serverUrl = localStorage.getItem(`project_${projectIdFromUrl}_server`);
      if (serverUrl) {
        console.log("📥 Loading REMOTE project...");
        loadRemoteProject(projectIdFromUrl);
      } else {
        console.log("📂 Loading LOCAL project by ID...");
        loadLocalProjectById(projectIdFromUrl);
      }
    } else {
      console.log("📂 Loading DEFAULT local projects...");
      fetchData();
    }
  }, [searchParams]);

  const loadLocalProjectById = async (projectId) => {
    updateProjectDetails({ isLoading: true });
    try {
      const { CurrentProject, ActiveFile, Error } = await loadProject(projectId);

      if (Error) {
        updateProjectDetails({ error: Error, isLoading: false });
        return;
      }

      let finalLatex = CurrentProject?.files[ActiveFile || "main.tex"]?.content || "";
      try {
        const localDraft = await getDraft(projectId);
        if (localDraft && localDraft.content) {
          console.log("📂 Restoring local draft for project:", projectId);
          finalLatex = localDraft.content;
        }
      } catch (e) {
        console.warn("Error loading local draft:", e);
      }

      updateProjectDetails({
        currentProject: CurrentProject,
        activeFile: ActiveFile,
        latexContent: finalLatex,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error in loadLocalProjectById:", error);
      updateProjectDetails({ error: "Failed to load project", isLoading: false });
    }
  };

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

      let finalLatex = project.files[project.activeFile || "main.tex"]?.content || "";

      // Check for local draft persistence
      try {
        const localDraft = await getDraft(projectId);
        if (localDraft && localDraft.content) {
          console.log("📂 Restoring local draft for project:", projectId);
          finalLatex = localDraft.content;
        }
      } catch (e) {
        console.warn("Could not check for local draft:", e);
      }

      updateProjectDetails({
        currentProject: project,
        activeFile: project.activeFile || "main.tex",
        latexContent: finalLatex,
        isLoading: false,
        isRemoteProject: true,
        serverUrl: serverUrl,
      });

      setRemoteProject({
        currentProject: project,
        activeFile: project.activeFile || "main.tex",
        latexContent: finalLatex,
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

        // const response = await axios.post(
        //   `http://localhost:5025/api/projects/${projectId}/get-collab-token`,
        //   {},
        //   { withCredentials: true }, // Sends httpOnly cookie
        // );

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

  // Reset on project or file change
  useEffect(() => {
    sectionsInitialized.current = false;
    lastSyncedLatex.current = "";
  }, [projectDetails.currentProject?.id, projectDetails.activeFile]);

  useEffect(() => {
    if (projectDetails.compilationMessage) {
      setLogs((prev) => [
        ...prev,
        `${projectDetails.compilationStatus} : ${projectDetails.compilationMessage}`,
      ]);
    }
  }, [projectDetails.compilationStatus, projectDetails.compilationMessage]);

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
              newLatexContent = sectionsToLatex(
                content,
                projectDetails.latexContent || lastSyncedLatex.current,
              );
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
            setSections(latexToSections(newLatexContent));
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

      // Debounced save to PouchDB
      if (pouchSaveTimeout.current) clearTimeout(pouchSaveTimeout.current);
      pouchSaveTimeout.current = setTimeout(() => {
        saveToPouchDB(projectDetails?.currentProject?.id, value);
      }, 300);
    },
    [updateAllEditors, projectDetails?.currentProject?.id],
  );

  const handleRichTextChange = useCallback(
    (value) => {
      setActiveEditor("richText");
      updateProjectDetails({ richTextContent: value });
      updateAllEditors("richText", value);
    },
    [updateAllEditors],
  );

  const handleSectionsChange = useCallback(
    (updatedSections) => {
      setActiveEditor("sections");
      setSections([...updatedSections]);
      updateAllEditors("sections", updatedSections);
    },
    [updateAllEditors],
  );

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

  // const getCollaborationToken = () => {
  //   // Priority 1: Check if this is a remote project (collaborator/guest)
  //   const projectId = projectDetails.currentProject?.id;
  //   if (projectId) {
  //     const guestToken = localStorage.getItem(
  //       `project_${projectId}_guest_token`,
  //     );
  //     if (guestToken) {
  //       console.log("✓ Using guest token for collaboration");
  //       return guestToken;
  //     }
  //   }

  //   // Priority 2: Use auth token (for owner or authenticated collaborator)
  //   const authToken = document.cookie
  //     .split("; ")
  //     .find((row) => row.startsWith("uid="))
  //     ?.split("=")[1];

  //   if (authToken) {
  //     console.log("✓ Using auth token for collaboration");
  //     return authToken;
  //   }

  //   console.warn("⚠️ No collaboration token found");
  //   return null;
  // };

  // const collaborationToken = getCollaborationToken();

  // console.log("Collaboration setup:", {
  //   projectId: projectDetails.currentProject?.id,
  //   hasToken: !!collaborationToken,
  //   isRemote: projectDetails.isRemoteProject,
  // });

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
      if (pouchSaveTimeout.current) clearTimeout(pouchSaveTimeout.current);
    };
  }, []);

  if (projectDetails.isLoading) {
    return (
      <div className={`flex h-screen items-center justify-center transition-colors duration-300 ${isDark ? "bg-[#121212] text-gray-400" : "bg-white text-gray-600"}`}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!projectDetails.currentProject) {
    return (
      <div className={`flex h-screen items-center justify-center transition-colors duration-300 ${isDark ? "bg-[#121212] text-gray-400" : "bg-white text-gray-600"}`}>
        <p>
          No project loaded. Please create or open a project.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-row h-screen overflow-hidden fixed inset-0 pt-11 transition-colors duration-300 ${isDark ? "bg-[#121212]" : ""} ${isSectionSpaceOpen ? "ml-64" : "ml-0"
        }`}
    >
      <LeaveSession projectId={projectDetails.currentProject?.id} />
      {/* Left side of the screen */}
      <div className={`flex-1 flex flex-shrink min-w-[40vw] flex-col border-r overflow-hidden ml-12 pb-[3.2vh] transition-colors duration-300 ${isDark ? "border-[#333]" : "border-[#CFCFCF]"}`}>
        <div className={`border-b flex-shrink-0 sticky top-0 z-10 transition-colors duration-300 ${isDark ? "border-[#333] bg-[#1a1a1a]" : "border-[#CFCFCF] bg-white"}`}>
          <div className="flex items-center">
            <button
              onClick={() => setActiveView("code")}
              className={`py-2 cursor-pointer flex-1 text-[13px] text-nowrap transition-all duration-200 ${activeView === "code"
                ? (isDark ? "bg-[#2d2d2d] border-[#444] text-white border-b-0" : "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0")
                : (isDark ? "text-gray-500 hover:bg-[#2d2d2d] hover:text-gray-300" : "text-gray-600 hover:bg-gray-100")
                }`}
            >
              Full Code View
            </button>
            <button
              onClick={() => setActiveView("text")}
              className={`py-2 cursor-pointer flex-1 text-[13px] text-nowrap transition-all duration-200 ${activeView === "text"
                ? (isDark ? "bg-[#2d2d2d] border-[#444] text-white border-b-0" : "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0")
                : (isDark ? "text-gray-500 hover:bg-[#2d2d2d] hover:text-gray-300" : "text-gray-600 hover:bg-gray-100")
                }`}
            >
              Full Text View
            </button>
            <button
              onClick={() => setActiveView("section")}
              className={`py-2 cursor-pointer flex-1 text-[13px] text-nowrap transition-all duration-200 ${activeView === "section"
                ? (isDark ? "bg-[#2d2d2d] border-[#444] text-white border-b-0" : "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0")
                : (isDark ? "text-gray-500 hover:bg-[#2d2d2d] hover:text-gray-300" : "text-gray-600 hover:bg-gray-100")
                }`}
            >
              Section View
            </button>
          </div>
          {/* <DebugPanel debugLogs={debugLogs} onClear={() => setDebugLogs([])} /> */}
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeView === "code" && (
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
      <div className={`flex-1 flex flex-shrink min-w-[40vw] flex-col border-r overflow-hidden transition-colors duration-300 ${isDark ? "border-[#333]" : "border-[#CFCFCF]"}`}>
        <div className={`border-b flex-shrink-0 sticky top-0 z-10 transition-colors duration-300 ${isDark ? "border-[#333] bg-[#1a1a1a]" : "border-[#CFCFCF] bg-white"}`}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveRightView("preview")}
              className={`py-2 cursor-pointer flex-1 text-[13px] text-nowrap transition-all duration-200 ${activeRightView === "preview"
                ? (isDark ? "bg-[#2d2d2d] border-[#444] text-white border-b-0" : "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0")
                : (isDark ? "text-gray-500 hover:bg-[#2d2d2d] hover:text-gray-300" : "text-gray-600 hover:bg-gray-100")
                }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveRightView("logs")}
              className={`py-2 cursor-pointer flex-1 text-[13px] text-nowrap transition-all duration-200 ${activeRightView === "logs"
                ? (isDark ? "bg-[#2d2d2d] border-[#444] text-white border-b-0" : "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0")
                : (isDark ? "text-gray-500 hover:bg-[#2d2d2d] hover:text-gray-300" : "text-gray-600 hover:bg-gray-100")
                }`}
            >
              Logs
            </button>
            <button
              onClick={() => setActiveRightView("aichat")}
              className={`py-2 cursor-pointer flex-1 text-[13px] text-nowrap transition-all duration-200 ${activeRightView === "aichat"
                ? (isDark ? "bg-[#2d2d2d] border-[#444] text-white border-b-0" : "bg-[#F5F5F5] border border-[#CFCFCF] border-b-0")
                : (isDark ? "text-gray-500 hover:bg-[#2d2d2d] hover:text-gray-300" : "text-gray-600 hover:bg-gray-100")
                }`}
            >
              AI Chat
            </button>
          </div>
        </div>

        {activeRightView === "preview" && (
          <div className="flex-1 overflow-hidden relative">
            <PdfViewer pdfUrl={projectDetails.pdfUrl} />
          </div>
        )}

        {activeRightView === "logs" && (
          <div className={`flex-1 overflow-y-auto px-10 py-4 font-mono transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
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
