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
import MathInsertModal from "../components/MathInsertModal";
import CitationManager from "../components/citationManager";
import FootnotePanel from "../components/FootnotePanel";
import CrossRefPanel from "../components/CrossRefPanel";
import { getRichTextHandlers } from "../components/richTextToolbar.jsx";
import GoBack from "../assets/icons/goBack.svg?react";
import FileIcon from "../assets/icons/file.svg?react";
import "react-quill-new/dist/quill.snow.css";
import "../App.css";
import {
  isMainFile,
  fileToSections,
  sectionsToFile,
  splitLatex,
  extractLatexBody,
  reconstructLatexDocument,
  latexToRichText,
  richTextToLatex,
  latexToSections,
  sectionsToLatex,
  sectionToRichText,
  richTextToSection,
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
  const {
    isSectionSpaceOpen,
    isAIChatOpen,
    setIsAIChatOpen,
    isDistractionFree,
    sectionSpaceWidth = 256,
  } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [remoteProject, setRemoteProject] = useState(null);
  const effectiveProjectDetails = remoteProject || projectDetails;
  const [collaborationToken, setCollaborationToken] = useState(null);
  const { user, isServerConnected, isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);
  const [splitPos, setSplitPos] = useState(50); // percentage for left panel
  const isDragging = useRef(false);
  const containerRef = useRef(null);

  const handleDragStart = (e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPos = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.min(80, Math.max(20, newPos)));
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Ctrl+P: Toggle PDF Preview fullscreen
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        setIsPdfFullscreen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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
  const [showMathModal, setShowMathModal] = useState(false);
  const [editingTableData, setEditingTableData] = useState(null);
  const [editingImageData, setEditingImageData] = useState(null);
  const [editingRange, setEditingRange] = useState(null);
  const [insertTargetQuill, setInsertTargetQuill] = useState(null);

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

  /**
   * Derive a section name for a non-main file from the parent document's \section command
   * or fallback to a pretty version of the filename.
   */
  const getSectionNameForFile = useCallback(
    (fileName) => {
      if (!fileName || !projectDetails.currentProject?.files["main.tex"])
        return null;

      const mainContent =
        projectDetails.currentProject.files["main.tex"].content;
      const baseName = fileName.replace(".tex", "");
      const regex = new RegExp(
        `\\\\section\\*?\\{([^}]*)\\}[\s\S]*?\\\\input\\{${baseName}\\}`,
        "i",
      );
      const match = mainContent.match(regex);
      if (match) return match[1];

      return fileName
        .replace(".tex", "")
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    },
    [projectDetails.currentProject?.files],
  );

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

  // Handle Toolbar Sidebar Triggers
  useEffect(() => {
    const handleOpenSidebar = (e) => {
      const { panelClass, quill } = e.detail;
      setInsertTargetQuill(quill || null);
      if (panelClass === "citation") setActiveRightView("citation");
      else if (panelClass === "footnote") setActiveRightView("footnote");
      else if (panelClass === "crossref") setActiveRightView("crossref");
    };

    document.addEventListener("trigger-open-sidebar", handleOpenSidebar);
    return () =>
      document.removeEventListener("trigger-open-sidebar", handleOpenSidebar);
  }, []);

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

  // Initialize Sections and Rich Text
  useEffect(() => {
    if (
      projectDetails.currentProject &&
      projectDetails.activeFile &&
      projectDetails.currentProject.files[projectDetails.activeFile] &&
      !sectionsInitialized.current
    ) {
      const activeFile = projectDetails.activeFile;
      const fileEntry = projectDetails.currentProject.files[activeFile];
      const latexDoc = fileEntry.content;
      const files = projectDetails.currentProject.files;

      // Gate on having more than just one file if we're expecting \input resolution
      // or if it's main.tex, ensure it looks like a valid document
      if (isMainFile(activeFile) && !latexDoc.includes("\\begin{document}")) {
        return;
      }

      sectionsInitialized.current = true;
      lastSyncedLatex.current = latexDoc;

      if (isMainFile(activeFile)) {
        const bodyContent = extractLatexBody(latexDoc);
        setSections(latexToSections(latexDoc, files));
        updateProjectDetails({
          latexContent: latexDoc,
          richTextContent: latexToRichText(bodyContent, files, {
            isFragment: false,
          }),
        });
      } else {
        const nameHint = getSectionNameForFile(activeFile);
        setSections(fileToSections(latexDoc, activeFile, nameHint, files));
        updateProjectDetails({
          latexContent: latexDoc,
          richTextContent: latexToRichText(latexDoc, files, {
            isFragment: true,
          }),
        });
      }
    }
  }, [
    projectDetails.currentProject?.id,
    projectDetails.activeFile,
    projectDetails.currentProject?.files,
  ]);

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
    if (projectDetails.currentProject?.id && !projectDetails.isLoading) {
      handleCompile();
    }
  }, [projectDetails.currentProject?.id]);

  useEffect(() => {
    if (projectDetails.logs) {
      // Split raw logs by newline and update the local logs state
      const rawLogLines = projectDetails.logs.split("\n");
      setLogs(rawLogLines);
    } else if (projectDetails.compilationMessage) {
      setLogs((prev) => [
        ...prev,
        `${projectDetails.compilationStatus} : ${projectDetails.compilationMessage}`,
      ]);
    }
  }, [projectDetails.compilationStatus, projectDetails.compilationMessage, projectDetails.logs]);

  // ============ ACTIVE FILE FILTERING ============
  // Filter sections for the currently active file (Used exclusively for Section Editor view)
  const activeSections = useMemo(() => {
    if (!sections || sections.length === 0) return [];
    const af = projectDetails.activeFile || "main.tex";

    // main.tex → show everything
    if (af === "main.tex") return sections;

    // Sub-file → find sections that belong to this file
    return sections.filter(
      (s) =>
        s.contentFileName === af || (s.source === "file" && s.fileName === af),
    );
  }, [sections, projectDetails.activeFile]);

  // Derive rich text from the active sections (SIMPLIFIED!)
  const activeRichText = useMemo(() => {
    return projectDetails.richTextContent || "";
  }, [projectDetails.richTextContent]);

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

  const updateAllEditors = useCallback(
    (source, content) => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }

      updateTimeout.current = setTimeout(
        () => {
          let newLatexContent;
          let rtFileUpdatesToApply = null;
          let sectionsFileUpdatesToApply = null;

          addDebugLog(`🔄 UPDATE from ${source}`, "info");

          switch (source) {
            case "monaco":
              newLatexContent = content;
              addDebugLog("✅ Monaco: Direct pass-through");
              break;

            case "richText":
              addDebugLog("🔄 Converting Rich Text → LaTeX");

              // Check what's in the rich text
              const hasPreambleMarker = content.includes("ql-latex-preamble");
              const hasPostambleMarker = content.includes("ql-latex-postamble");
              addDebugLog(
                `Rich text markers: Preamble=${hasPreambleMarker}, Postamble=${hasPostambleMarker}`,
                hasPreambleMarker && hasPostambleMarker ? "success" : "warning",
              );

              const isFragment = !isMainFile(projectDetails.activeFile);
              const rtResult = richTextToLatex(content, { isFragment });
              const bodyContent = rtResult.body;
              const rtFileUpdates = rtResult.fileUpdates || {};

              if (isFragment) {
                newLatexContent = bodyContent;
              } else {
                newLatexContent = reconstructLatexDocument(
                  projectDetails.latexContent || lastSyncedLatex.current,
                  bodyContent,
                );
              }

              // Store file updates for downstream merging
              rtFileUpdatesToApply = rtFileUpdates;

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
              const result = sectionsToLatex(content);
              newLatexContent = result.latex;

              // Store file updates for downstream merging
              sectionsFileUpdatesToApply = result.fileUpdates;

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

          // Build updated project with all file changes
          let updatedFiles = { ...projectDetails.currentProject.files };

          // 1. apply sub-file updates from either richText or sections
          const fileUpdates =
            rtFileUpdatesToApply || sectionsFileUpdatesToApply;
          if (fileUpdates) {
            for (const [fname, fcontent] of Object.entries(fileUpdates)) {
              if (updatedFiles[fname]) {
                updatedFiles[fname] = {
                  ...updatedFiles[fname],
                  content: fcontent,
                };
              } else {
                updatedFiles[fname] = { content: fcontent };
              }
            }
          }

          // 2. Apply main active file update
          updatedFiles[projectDetails.activeFile] = {
            ...updatedFiles[projectDetails.activeFile],
            content: newLatexContent,
          };

          const updatedProject = {
            ...projectDetails.currentProject,
            files: updatedFiles,
          };

          updateProjectDetails({
            latexContent: newLatexContent,
            currentProject: updatedProject,
          });

          // Update derived states for non-active editors
          if (source !== "richText") {
            addDebugLog("🔄 Updating rich text from LaTeX");
            const isFragment = !isMainFile(projectDetails.activeFile);
            const richText = isFragment
              ? latexToRichText(newLatexContent, updatedProject.files, {
                  isFragment: true,
                })
              : latexToRichText(
                  extractLatexBody(newLatexContent),
                  updatedProject.files,
                  {
                    isFragment: false,
                  },
                );

            updateProjectDetails({
              richTextContent: richText,
            });
          }

          if (source !== "sections") {
            addDebugLog("🔄 Updating sections from LaTeX");
            const isFragment = !isMainFile(projectDetails.activeFile);
            if (isFragment) {
              const nameHint = getSectionNameForFile(projectDetails.activeFile);
              setSections(
                fileToSections(
                  newLatexContent,
                  projectDetails.activeFile,
                  nameHint,
                  updatedProject.files,
                ),
              );
            } else {
              setSections(
                latexToSections(newLatexContent, updatedProject.files),
              );
            }
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
      updateProjectDetails({ richTextContent: value });
      updateAllEditors("richText", value);
    },
    [updateAllEditors, updateProjectDetails],
  );

  const handleSectionsChange = useCallback(
    (updatedSections) => {
      setActiveEditor("sections");
      const af = projectDetails.activeFile || "main.tex";

      if (isMainFile(af)) {
        setSections([...updatedSections]);
        updateAllEditors("sections", updatedSections);
      } else {
        // Sub-file: convert root node back to raw content
        const result = sectionsToFile(updatedSections, af);
        setSections([...updatedSections]);
        updateAllEditors("monaco", result.latex);
      }
    },
    [updateAllEditors, projectDetails.activeFile],
  );

  const handlePdfLineJump = (lineNumber) => {
    console.log("🚀 SyncTeX Triggered in EditorPage. Line:", lineNumber);
    // 1. Set the line number to state to trigger highlighting in children
    setSyncTexLine(lineNumber);
  };

  // Helper to clear highlight after jump is done
  const clearSyncTex = () => setSyncTexLine(null);

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
    setIsLoading(true);
    try {
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
        logs: response.logs, // Capture raw logs
      });
    } catch (error) {
      console.error("Compilation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const quillModules = useMemo(
    () => ({
      toolbar: {
        container: "#richtext-main-toolbar",
        handlers: getRichTextHandlers(),
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    [],
  );

  useEffect(() => {
    const handleInsertTable = (e) => {
      setInsertTargetQuill(e.detail?.quill || null);
      setEditingTableData(null);
      setEditingRange(null);
      setShowTableModal(true);
    };
    const handleInsertImage = (e) => {
      setInsertTargetQuill(e.detail?.quill || null);
      setEditingImageData(null);
      setEditingRange(null);
      setShowImageModal(true);
    };
    const handleInsertMath = (e) => {
      setInsertTargetQuill(e.detail?.quill || null);
      setShowMathModal(true);
    };
    const handleInsertCitation = (e) => {
      const quill = e.detail?.quill;
      if (quill) {
        const text = prompt("Enter citation key (e.g. Smith2024):");
        if (text) {
          const cursorPosition = quill.getSelection()?.index || 0;
          quill.insertEmbed(
            cursorPosition,
            "latex-inline",
            { type: "citation", value: text },
            "user",
          );
          quill.setSelection(cursorPosition + 1);
        }
      }
    };

    document.addEventListener("trigger-insert-table", handleInsertTable);
    document.addEventListener("trigger-insert-image", handleInsertImage);
    document.addEventListener("trigger-insert-math", handleInsertMath);
    document.addEventListener("trigger-insert-citation", handleInsertCitation);

    return () => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      document.removeEventListener("trigger-insert-table", handleInsertTable);
      document.removeEventListener("trigger-insert-image", handleInsertImage);
      document.removeEventListener("trigger-insert-math", handleInsertMath);
      document.removeEventListener(
        "trigger-insert-citation",
        handleInsertCitation,
      );
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

  // Inject CSS for the new Quill Toolbar icons
  const customToolbarCSS = `
    .ql-snow .ql-toolbar button.ql-footnote { width: 32px; font-weight: 600; font-size: 11px; color: #6b7280; font-family: sans-serif; }
    .ql-snow .ql-toolbar button.ql-footnote::after { content: "Fn"; }
    .ql-snow .ql-toolbar button.ql-citation { width: 34px; font-weight: 600; font-size: 11px; color: #6b7280; font-family: sans-serif; }
    .ql-snow .ql-toolbar button.ql-citation::after { content: "Cite"; }
    .ql-snow .ql-toolbar button.ql-ref { width: 34px; font-weight: 600; font-size: 11px; color: #6b7280; font-family: sans-serif; }
    .ql-snow .ql-toolbar button.ql-ref::after { content: "Ref"; }
    .ql-snow .ql-toolbar button.ql-pagebreak { width: 44px; font-weight: 600; font-size: 11px; color: #6b7280; font-family: sans-serif; }
    .ql-snow .ql-toolbar button.ql-pagebreak::after { content: "Break"; }
    
    .ql-snow .ql-toolbar button.ql-table { width: 40px; font-weight: 600; font-size: 11px; color: #6b7280; font-family: sans-serif; }
    .ql-snow .ql-toolbar button.ql-table::after { content: "Table"; }
    .ql-snow .ql-toolbar button.ql-image { width: 40px; font-weight: 600; font-size: 11px; color: #6b7280; font-family: sans-serif; }
    .ql-snow .ql-toolbar button.ql-image::after { content: "Image"; }
    .ql-snow .ql-toolbar button.ql-formula { width: 40px; font-weight: 600; font-size: 11px; color: #6b7280; font-family: sans-serif; }
    .ql-snow .ql-toolbar button.ql-formula::after { content: "Math"; }

    .ql-snow .ql-toolbar button.ql-footnote:hover,
    .ql-snow .ql-toolbar button.ql-citation:hover,
    .ql-snow .ql-toolbar button.ql-ref:hover,
    .ql-snow .ql-toolbar button.ql-pagebreak:hover,
    .ql-snow .ql-toolbar button.ql-table:hover,
    .ql-snow .ql-toolbar button.ql-image:hover,
    .ql-snow .ql-toolbar button.ql-formula:hover { color: #2563eb !important; }
  `;

  const leftOffset = isDistractionFree
    ? 0
    : isSectionSpaceOpen
      ? 40 + sectionSpaceWidth
      : 40;

  return (
    <div
      ref={containerRef}
      className={`flex flex-row h-screen overflow-hidden fixed inset-0 pt-7`}
      style={{
        marginLeft: isDistractionFree ? 0 : leftOffset,
        paddingTop: isDistractionFree ? 0 : undefined,
        background:
          settings.appearance.customThemes[settings.appearance.theme].primary,
      }}
    >
      <style>{customToolbarCSS}</style>
      <LeaveSession projectId={projectDetails.currentProject?.id} />
      {/* Left side of the screen — hidden when PDF is fullscreen */}
      {!isPdfFullscreen && (
        <div
          className="flex flex-col border-r overflow-hidden pb-[3.2vh] flex-shrink-0"
          style={{ width: `${splitPos}%` }}
        >
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
                {activeFileType === "image"
                  ? "Image Preview"
                  : activeFileType === "pdf"
                    ? "PDF Preview"
                    : "Read Only"}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-hidden relative">
            {/* ---- Image Preview ---- */}
            {activeFileType === "image" && (
              <div className="h-full w-full flex flex-col items-center justify-center bg-[#FAFAFA]">
                <div className="max-w-[90%] max-h-[80%] rounded-lg border border-[#CFCFCF] shadow-sm overflow-hidden bg-white">
                  <img
                    src={
                      projectDetails.currentProject?.files[
                        projectDetails.activeFile
                      ]?.content || ""
                    }
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
                  src={
                    projectDetails.currentProject?.files[
                      projectDetails.activeFile
                    ]?.content || ""
                  }
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
                  // Apply file updates from AI response
                  const updatedFiles = {
                    ...projectDetails.currentProject.files,
                  };

                  // Apply per-file updates
                  if (fileUpdates && Object.keys(fileUpdates).length > 0) {
                    for (const [fileName, content] of Object.entries(
                      fileUpdates,
                    )) {
                      if (updatedFiles[fileName]) {
                        updatedFiles[fileName] = {
                          ...updatedFiles[fileName],
                          content,
                        };
                      } else {
                        updatedFiles[fileName] = {
                          name: fileName.split("/").pop(),
                          content,
                          type: "tex",
                        };
                      }
                    }
                  }

                  // Update main.tex content
                  updatedFiles["main.tex"] = {
                    ...updatedFiles["main.tex"],
                    content: newContent,
                  };

                  updateProjectDetails({
                    currentProject: {
                      ...projectDetails.currentProject,
                      files: updatedFiles,
                    },
                  });

                  // If the active file was updated by the AI, refresh the editor with its new content
                  const activeFile = projectDetails.activeFile || "main.tex";
                  if (
                    activeFile !== "main.tex" &&
                    fileUpdates &&
                    fileUpdates[activeFile]
                  ) {
                    updateAllEditors("monaco", fileUpdates[activeFile]);
                  } else {
                    updateAllEditors("monaco", newContent);
                  }
                }}
                onClose={() => setShowAIChat(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Drag Divider — hidden when PDF is fullscreen */}
      {!isPdfFullscreen && (
        <div
          onMouseDown={handleDragStart}
          className="w-1 flex-shrink-0 cursor-col-resize relative group z-20"
          style={{
            background:
              settings.appearance.customThemes[settings.appearance.theme]
                .border,
          }}
        >
          {/* Visible handle indicator on hover */}
          <div className="absolute inset-y-0 -left-0.5 -right-0.5 group-hover:bg-gray-400 group-hover:opacity-30 transition-opacity" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-10 bg-gray-500 rounded-full" />
          </div>
        </div>
      )}

      {/* Right side of the screen */}
      <div
        className="flex flex-col overflow-hidden"
        style={{
          borderColor:
            settings.appearance.customThemes[settings.appearance.theme].border,
          flex: isPdfFullscreen ? "1 1 auto" : "1 1 0%",
        }}
      >
        {activeRightView === "preview" && (
          <div className="flex-1 overflow-auto relative">
            <PdfViewer
              pdfUrl={projectDetails.pdfUrl}
              pdfFileName={projectDetails.pdfFileName}
              onLineJump={handlePdfLineJump}
              onCompile={handleCompile}
              fileTitle={projectDetails.currentProject.title}
              onShowLogs={() => setActiveRightView("logs")}
              projectDetails={projectDetails}
              loading={isLoading}
            />
          </div>
        )}

        {activeRightView === "logs" && (
          <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAFAFA]">
            {/* Go Back Button */}
            <button
              onClick={() => setActiveRightView("preview")}
              className="sticky top-2 ml-4 mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-100 transition-colors"
            >
              <GoBack className="w-4 h-4" style={{ fill: "#0a0a0a" }} />
              Go Back
            </button>

            <hr className="border-gray-200" />

            {/* Logs Container */}
            <div className="px-6 py-4 font-mono text-sm text-gray-900 space-y-2 overflow-y-auto">
              {logs.length > 0 ? (
                logs.map((log, i) => {
                  const isError =
                    log.toLowerCase().includes("error") ||
                    log.toLowerCase().includes("fatal");
                  const isWarning = log.toLowerCase().includes("warning");

                  return (
                    <div
                      key={i}
                      className={`p-2 rounded border-l-4 ${
                        isError
                          ? "border-red-500 bg-red-50 text-red-900"
                          : isWarning
                            ? "border-yellow-400 bg-yellow-50 text-yellow-800"
                            : "border-green-400 bg-gray-50"
                      }`}
                    >
                      {log}
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-400 italic">No logs available.</div>
              )}
            </div>
          </div>
        )}

        {/* Sidebar Integrations */}
        {activeRightView === "citation" && (
          <div className="flex-1 overflow-hidden relative bg-[#FAFAFA] flex flex-col">
            <button
              onClick={() => setActiveRightView("preview")}
              className="absolute top-2 left-4 z-10 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-800 shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-gray-100 hover:bg-gray-50 hover:shadow-[0_4px_6px_rgba(0,0,0,0.05)] transition-all max-w-[fit-content]"
            >
              <GoBack className="w-4 h-4" style={{ fill: "#0a0a0a" }} />
              Back
            </button>
            <div className="pt-12 flex-1 overflow-y-auto w-full h-full">
              <CitationManager
                isModal={false}
                onClose={() => setActiveRightView("preview")}
                showInsertButton={!!insertTargetQuill || activeView === "code"}
                onInsert={(latex) => {
                  if (insertTargetQuill) {
                    const cursorPosition =
                      insertTargetQuill.getSelection()?.index ||
                      insertTargetQuill.savedCursorPosition ||
                      0;
                    const citeWrapper = `\\cite{${latex.match(/\\cite\{([^}]+)\}/)?.[1] || latex}}`;
                    insertTargetQuill.insertEmbed(
                      cursorPosition,
                      "latex-inline",
                      {
                        type: "citation",
                        value:
                          citeWrapper.match(/\\cite\{([^}]+)\}/)?.[1] || latex,
                      },
                      "user",
                    );
                    insertTargetQuill.setSelection(cursorPosition + 1);
                  } else if (monacoEditorRef.current?.insertAtCursor) {
                    monacoEditorRef.current.insertAtCursor(
                      `\\cite{${latex.match(/\\cite\{([^}]+)\}/)?.[1] || latex}}`,
                    );
                  }
                  setActiveRightView("preview");
                }}
              />
            </div>
          </div>
        )}

        {activeRightView === "footnote" && (
          <div className="flex-1 overflow-hidden relative bg-[#FAFAFA] flex flex-col">
            <button
              onClick={() => setActiveRightView("preview")}
              className="absolute top-2 left-4 z-10 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-800 shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-gray-100 hover:bg-gray-50 hover:shadow-[0_4px_6px_rgba(0,0,0,0.05)] transition-all max-w-[fit-content]"
            >
              <GoBack className="w-4 h-4" style={{ fill: "#0a0a0a" }} />
              Back
            </button>
            <div className="pt-12 flex-1 overflow-y-auto w-full h-full">
              <FootnotePanel
                isModal={false}
                onClose={() => setActiveRightView("preview")}
                showInsertButton={!!insertTargetQuill || activeView === "code"}
                onInsert={(text) => {
                  if (insertTargetQuill) {
                    const cursorPosition =
                      insertTargetQuill.getSelection()?.index ||
                      insertTargetQuill.savedCursorPosition ||
                      0;
                    insertTargetQuill.insertEmbed(
                      cursorPosition,
                      "latex-inline",
                      { type: "footnote", value: text },
                      "user",
                    );
                    insertTargetQuill.setSelection(cursorPosition + 1);
                  } else if (monacoEditorRef.current?.insertAtCursor) {
                    monacoEditorRef.current.insertAtCursor(
                      `\\footnote{${text}}`,
                    );
                  }
                  setActiveRightView("preview");
                }}
              />
            </div>
          </div>
        )}

        {activeRightView === "crossref" && (
          <div className="flex-1 overflow-hidden relative bg-[#FAFAFA] flex flex-col">
            <button
              onClick={() => setActiveRightView("preview")}
              className="absolute top-2 left-4 z-10 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-800 shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-gray-100 hover:bg-gray-50 hover:shadow-[0_4px_6px_rgba(0,0,0,0.05)] transition-all max-w-[fit-content]"
            >
              <GoBack className="w-4 h-4" style={{ fill: "#0a0a0a" }} />
              Back
            </button>
            <div className="pt-12 flex-1 overflow-y-auto w-full h-full">
              <CrossRefPanel
                isModal={false}
                projectFiles={projectDetails.currentProject?.files || {}}
                onClose={() => setActiveRightView("preview")}
                showInsertButton={!!insertTargetQuill || activeView === "code"}
                onInsert={(label) => {
                  if (insertTargetQuill) {
                    const cursorPosition =
                      insertTargetQuill.getSelection()?.index ||
                      insertTargetQuill.savedCursorPosition ||
                      0;
                    insertTargetQuill.insertEmbed(
                      cursorPosition,
                      "latex-inline",
                      { type: "ref", value: label },
                      "user",
                    );
                    insertTargetQuill.setSelection(cursorPosition + 1);
                  } else if (monacoEditorRef.current?.insertAtCursor) {
                    monacoEditorRef.current.insertAtCursor(`\\ref{${label}}`);
                  }
                  setActiveRightView("preview");
                }}
              />
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
          setInsertTargetQuill(null);
        }}
        initialData={editingTableData}
        showInsertButton={!!insertTargetQuill}
        onInsert={(latex) => {
          if (insertTargetQuill) {
            const cursorPosition = insertTargetQuill.getSelection()?.index || 0;
            const b64Latex = btoa(unescape(encodeURIComponent(latex)));
            insertTargetQuill.insertEmbed(
              cursorPosition,
              "latex-block",
              { type: "table", latex: b64Latex },
              "user",
            );
            insertTargetQuill.insertText(cursorPosition + 1, "\n", "user");
            insertTargetQuill.setSelection(cursorPosition + 2);
          } else if (monacoEditorRef.current) {
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
          setInsertTargetQuill(null);
        }}
        initialData={editingImageData}
        projectFiles={
          projectDetails.currentProject?.files
            ? Object.keys(projectDetails.currentProject.files).filter((f) =>
                /\.(png|jpg|jpeg|pdf|eps|svg)$/i.test(f),
              )
            : []
        }
        showInsertButton={!!insertTargetQuill}
        onInsert={(latex) => {
          if (insertTargetQuill) {
            const cursorPosition = insertTargetQuill.getSelection()?.index || 0;
            const b64Latex = btoa(unescape(encodeURIComponent(latex)));
            insertTargetQuill.insertEmbed(
              cursorPosition,
              "latex-block",
              { type: "image", latex: b64Latex },
              "user",
            );
            insertTargetQuill.insertText(cursorPosition + 1, "\n", "user");
            insertTargetQuill.setSelection(cursorPosition + 2);
          } else if (monacoEditorRef.current) {
            if (editingRange) {
              monacoEditorRef.current.replaceRange(editingRange, latex);
            } else if (monacoEditorRef.current.insertAtCursor) {
              monacoEditorRef.current.insertAtCursor(latex);
            }
          }
        }}
      />

      {/* Math Insert Modal for main Monaco editor */}
      <MathInsertModal
        isOpen={showMathModal}
        onClose={() => {
          setShowMathModal(false);
          setInsertTargetQuill(null);
        }}
        showInsertButton={!!insertTargetQuill}
        onInsert={(latex) => {
          if (insertTargetQuill) {
            const cursorPosition = insertTargetQuill.getSelection()?.index || 0;
            const b64Latex = btoa(unescape(encodeURIComponent(latex)));
            insertTargetQuill.insertEmbed(
              cursorPosition,
              "latex-block",
              { type: "equation", latex: b64Latex },
              "user",
            );
            insertTargetQuill.insertText(cursorPosition + 1, "\n", "user");
            insertTargetQuill.setSelection(cursorPosition + 2);
          } else if (
            monacoEditorRef.current &&
            monacoEditorRef.current.insertAtCursor
          ) {
            monacoEditorRef.current.insertAtCursor(latex);
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
