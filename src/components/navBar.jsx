import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "./searchBar";
import MenuDropdown from "./menuDropdown";
import ShortcutsModal from "./shortcutsModal";
import { projectContext } from "../context/useProject";
import ConfirmModal from "./confirmModal";
import EditIcon from "../assets/icons/edit.svg?react";
import { saveProject } from "../api/projectHandling";
import TickIcon from "../assets/icons/tickIcon.svg?react";
import ToMaxIcon from "../assets/icons/minmaxIcon.svg?react";
import ToMinIcon from "../assets/icons/minmaxIcon1.svg?react";
import { useAuth } from "../context/useAuth";
import { useToast } from "../hooks/useToast";
import { useSettings } from "../context/useSettings";
import axios from "axios";

const API_URL = "http://localhost:5000";

const NavBar = ({ onStartTour }) => {
  const navigate = useNavigate();
  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [renameProject, setRenameProject] = useState(false);
  const [updatetitle, setUpdateTitle] = useState("");
  const menuRefs = useRef({});
  const showToast = useToast();
  const { isServerConnected, isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  const hasProject = projectDetails.currentProject !== null;
  // File Menu Actions
  const handleNewProject = () => {
    navigate("/template");
  };

  const handleOpenProject = () => {
    navigate("/");
  };

  // Listen for maximize/unmaximize events (Specific to Electron)
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMaximize(() => setIsMaximized(true));
      window.electronAPI.onUnmaximize(() => setIsMaximized(false));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const el = menuRefs.current.file;
      if (el && !el.contains(e.target)) {
        setRenameProject(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveProject = async () => {
    if (!projectDetails.currentProject || !projectDetails.activeFile) {
      setAlertModal({
        isOpen: true,
        title: "No Project",
        message: "No project to save",
      });
      return;
    }

    try {
      await saveProject(
        projectDetails.currentProject,
        projectDetails.currentProject.activeFile,
        undefined,
        undefined,
        isServerConnected,
        isAuthenticated,
      );
      showToast("success", "Saved Project");
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;

    try {
      const res = await axios.post(`${API_URL}/api/templates/save`, {
        name: templateName.trim(),
        files: projectDetails.currentProject.files,
      });

      if (res.data.success) {
        showToast("success", `Template "${templateName.trim()}" saved`);
        setShowSaveTemplateModal(false);
        setTemplateName("");
      } else {
        showToast("error", res.data.error || "Failed to save template");
      }
    } catch (error) {
      const msg = error.response?.data?.error || "Failed to save template";
      showToast("error", msg);
    }
  };

  // const handleSaveAs = async () => {
  //   if (!projectDetails.currentProject) {
  //     alert("No project to save");
  //     return;
  //   }

  //   const newTitle = prompt(
  //     "Enter new project title:",
  //     `${projectDetails.currentProject.title} - Copy`,
  //   );

  //   if (!newTitle || newTitle.trim() === "") {
  //     return;
  //   }

  //   try {
  //     const response = await axios.post(`${API_URL}/api/projects`, {
  //       title: newTitle.trim(),
  //       template: projectDetails.currentProject.template,
  //       files: projectDetails.currentProject.files,
  //     });

  //     updateProjectDetails({
  //       currentProject: response.data.project,
  //       compilationStatus: "success",
  //       compilationMessage: `Project saved as "${newTitle}"`,
  //     });

  //     setTimeout(() => {
  //       updateProjectDetails({
  //         compilationStatus: "",
  //         compilationMessage: "",
  //       });
  //     }, 2000);

  //     navigate("/canvas");
  //   } catch (error) {
  //     console.error("Save As failed:", error);
  //     updateProjectDetails({
  //       compilationStatus: "error",
  //       compilationMessage: "Failed to save project as new",
  //     });

  //     setTimeout(() => {
  //       updateProjectDetails({
  //         compilationStatus: "",
  //         compilationMessage: "",
  //       });
  //     }, 3000);
  //   }
  // };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Ctrl+S or Cmd+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasProject) {
          await saveProject(
            projectDetails.currentProject,
            projectDetails.currentProject.activeFile,
            undefined,
            undefined,
            isServerConnected,
            isAuthenticated,
          );
          showToast("success", "Saved Project");
        }
      }

      // Ctrl+N or Cmd+N - New Project
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        handleNewProject();
      }

      // Ctrl+O or Cmd+O - Open Project
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        navigate("/");
      }

      // Ctrl+Shift+S or Cmd+Shift+S - Save As
      // if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
      //   e.preventDefault();
      //   if (hasProject) {
      //     handleSaveAs();
      //   }
      // }

      // Escape - Close menu
      if (e.key === "Escape") {
        setActiveMenu(null);
        setShowShortcutsModal(false);
      }

      // ? - Show shortcuts
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setShowShortcutsModal(true);
      }

      // Ctrl+1, Ctrl+2, Ctrl+3 - Switch views
      if ((e.ctrlKey || e.metaKey) && hasProject) {
        if (e.key === "1") {
          e.preventDefault();
          updateProjectDetails({ activeView: "code" });
          if (window.location.pathname !== "/canvas") {
            navigate("/canvas");
          }
        } else if (e.key === "2") {
          e.preventDefault();
          updateProjectDetails({ activeView: "text" });
          if (window.location.pathname !== "/canvas") {
            navigate("/canvas");
          }
        } else if (e.key === "3") {
          e.preventDefault();
          updateProjectDetails({ activeView: "section" });
          if (window.location.pathname !== "/canvas") {
            navigate("/canvas");
          }
        }
      }

      // Ctrl+B - Toggle Section Space
      if ((e.ctrlKey || e.metaKey) && e.key === "b" && hasProject) {
        e.preventDefault();
        updateProjectDetails({
          isSectionSpaceOpen: !projectDetails.isSectionSpaceOpen,
        });
      }

      // Ctrl+P - Toggle PDF Preview (prevent default print)
      if ((e.ctrlKey || e.metaKey) && e.key === "p" && hasProject) {
        e.preventDefault();
        updateProjectDetails({
          showPdfPreview: !projectDetails.showPdfPreview,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasProject, projectDetails, navigate, updateProjectDetails]);

  const handleMenuClick = (menuName, event) => {
    if (activeMenu === menuName) {
      setActiveMenu(null);
    } else {
      const rect = event.target.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 2,
        left: rect.left,
      });
      setActiveMenu(menuName);
    }
  };

  const handleExportPDF = async () => {
    const pdfUrl = projectDetails.pdfUrl;
    const fileTitle = projectDetails.currentProject.title;
    if (!pdfUrl) {
      setAlertModal({
        isOpen: true,
        title: "PDF Not Found",
        message: "Please compile your document first to generate a PDF",
      });
      return;
    }

    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const defaultName = `${fileTitle || "document"}.pdf`;

      // Check if we are running inside the Electron Desktop App
      const isElectron =
        window.electronAPI && typeof window.electronAPI.savePDF === "function";

      if (isElectron) {
        const arrayBuffer = await blob.arrayBuffer();
        const result = await window.electronAPI.savePDF(
          arrayBuffer,
          defaultName,
        );

        if (result.success) {
          console.log("PDF saved successfully to:", result.filePath);
        } else if (!result.canceled) {
          throw new Error(result.error || "Unknown Electron save error");
        }
      } else {
        // For Web Browser - Create a local URL for the Blob
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = downloadUrl;
        link.download = defaultName;

        // Append to body to ensure compatibility with all browsers
        document.body.appendChild(link);
        link.click();

        // Cleanup: Remove element and revoke URL to prevent memory leaks
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        console.log("PDF download triggered via Browser");
      }
    } catch (error) {
      console.error("Error during PDF export:", error);
      setAlertModal({
        isOpen: true,
        title: "Export Error",
        message: `An error occurred during PDF export: ${error.message}`,
      });
    }
  };

  const handleExportZip = async () => {
    if (!projectDetails.currentProject) return;

    const projectId = projectDetails.currentProject.id;
    const projectTitle = projectDetails.currentProject.title;
    const exportUrl = `${API_URL}/api/projects/${projectId}/export-zip`;

    try {
      const response = await fetch(exportUrl);
      if (!response.ok) throw new Error("Failed to generate ZIP");

      const blob = await response.blob();
      const defaultName = `${projectTitle || "project"}.zip`;

      // Electron Save Dialog
      if (
        window.electronAPI &&
        typeof window.electronAPI.savePDF === "function"
      ) {
        // Reuse savePDF logic but for zip (it just saves a buffer to a file)
        const arrayBuffer = await blob.arrayBuffer();
        const result = await window.electronAPI.savePDF(
          arrayBuffer,
          defaultName,
        );
        if (result.success) {
          console.log("ZIP saved successfully to:", result.filePath);
        } else if (!result.canceled) {
          throw new Error(result.error || "Failed to save ZIP");
        }
      } else {
        // Browser Download
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = defaultName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error("Error during ZIP export:", error);
      setAlertModal({
        isOpen: true,
        title: "Export Error",
        message: `An error occurred during ZIP export: ${error.message}`,
      });
    }
  };

  const handleCloseProject = () => {
    setShowCloseConfirm(true);
  };

  const confirmClose = () => {
    updateProjectDetails({
      currentProject: null,
      activeFile: null,
      latexContent: "",
      richTextContent: "",
      pdfUrl: "",
    });
    setShowCloseConfirm(false);
    navigate("/");
  };

  // View Menu Actions
  const handleSwitchView = (view) => {
    updateProjectDetails({ activeView: view });
    if (window.location.pathname !== "/canvas") {
      navigate("/canvas");
    }
  };

  const handleToggleSectionSpace = () => {
    updateProjectDetails({
      isSectionSpaceOpen: !projectDetails.isSectionSpaceOpen,
    });
  };

  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Help Menu Actions
  const handleShowShortcuts = () => {
    setShowShortcutsModal(true);
  };

  const handleAbout = () => {
    setAlertModal({
      isOpen: true,
      title: "About Docière Pro",
      message:
        "Docière Pro v1.0\nLaTeX Editor Redefined\n\nA modern LaTeX editor with intuitive interfaces:\n• Full Code View with Monaco Editor\n• Rich Text Editor for WYSIWYG editing\n• Section-based editing for structured documents\n\nCreated with ❤️ for seamless document creation",
    });
  };

  // Menu Configurations
  const fileMenuItems = [
    {
      label: "New Project",
      shortcut: "Ctrl+N",
      action: handleNewProject,
    },
    {
      label: "Open Project",
      shortcut: "Ctrl+O",
      action: handleOpenProject,
    },
    { divider: true },
    {
      label: "Save",
      shortcut: "Ctrl+S",
      action: handleSaveProject,
      disabled: !hasProject,
    },
    // {
    //   label: "Save As...",
    //   shortcut: "Ctrl+Shift+S",
    //   action: handleSaveAs,
    //   disabled: !hasProject,
    // },
    {
      label: "Save as Template",
      action: () => setShowSaveTemplateModal(true),
      disabled: !hasProject,
    },
    { divider: true },
    {
      label: "Export as PDF",
      action: handleExportPDF,
      disabled: !hasProject || !projectDetails.pdfUrl,
    },
    {
      label: "Export as .zip",
      action: handleExportZip,
      disabled: !hasProject,
    },
    { divider: true },
    {
      label: "Close Project",
      action: handleCloseProject,
      disabled: !hasProject,
    },
  ];

  const editMenuItems = [
    {
      label: "Undo",
      shortcut: "Ctrl+Z",
      action: () => {
        // Monaco editor handles this natively
        const activeElement = document.activeElement;
        if (
          activeElement &&
          activeElement.classList.contains("monaco-editor")
        ) {
          // Focus is in Monaco editor - it handles undo automatically
          return;
        }
        // For other editors, trigger undo if possible
        document.execCommand("undo");
      },
      disabled: !hasProject,
    },
    {
      label: "Redo",
      shortcut: "Ctrl+Y",
      action: () => {
        // Monaco editor handles this natively
        const activeElement = document.activeElement;
        if (
          activeElement &&
          activeElement.classList.contains("monaco-editor")
        ) {
          return;
        }
        document.execCommand("redo");
      },
      disabled: !hasProject,
    },
    { divider: true },
    {
      label: "Cut",
      shortcut: "Ctrl+X",
      action: async () => {
        try {
          const selection = window.getSelection()?.toString();
          if (selection) {
            await navigator.clipboard.writeText(selection);
            document.execCommand("delete");
          }
        } catch (err) {
          console.error("Failed to cut:", err);
          // Fallback to old method
          document.execCommand("cut");
        }
      },
      disabled: !hasProject,
    },
    {
      label: "Copy",
      shortcut: "Ctrl+C",
      action: async () => {
        try {
          const selection = window.getSelection()?.toString();
          if (selection) {
            await navigator.clipboard.writeText(selection);
          }
        } catch (err) {
          console.error("Failed to copy:", err);
          // Fallback to old method
          document.execCommand("copy");
        }
      },
      disabled: !hasProject,
    },
    {
      label: "Paste",
      shortcut: "Ctrl+V",
      action: async () => {
        try {
          const text = await navigator.clipboard.readText();
          const activeElement = document.activeElement;
          if (
            activeElement &&
            (activeElement.tagName === "INPUT" ||
              activeElement.tagName === "TEXTAREA")
          ) {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            const value = activeElement.value;
            activeElement.value =
              value.substring(0, start) + text + value.substring(end);
            activeElement.selectionStart = activeElement.selectionEnd =
              start + text.length;
          }
        } catch (err) {
          console.error("Failed to paste:", err);
          // Fallback to old method
          document.execCommand("paste");
        }
      },
      disabled: !hasProject,
    },
    { divider: true },
    {
      label: "Find",
      shortcut: "Ctrl+F",
      action: () => {
        // Monaco editor handles find natively when focused
        // For other views, we can show a custom find dialog
        const event = new KeyboardEvent("keydown", {
          key: "f",
          ctrlKey: true,
          bubbles: true,
        });
        document.activeElement?.dispatchEvent(event);
      },
      disabled: !hasProject,
    },
    {
      label: "Replace",
      shortcut: "Ctrl+H",
      action: () => {
        // Monaco editor handles replace natively
        const event = new KeyboardEvent("keydown", {
          key: "h",
          ctrlKey: true,
          bubbles: true,
        });
        document.activeElement?.dispatchEvent(event);
      },
      disabled: !hasProject,
    },
    { divider: true },
    {
      label: "Select All",
      shortcut: "Ctrl+A",
      action: () => {
        // Let the browser handle this natively
        const event = new KeyboardEvent("keydown", {
          key: "a",
          ctrlKey: true,
          bubbles: true,
        });
        document.activeElement?.dispatchEvent(event);
      },
      disabled: !hasProject,
    },
  ];

  const viewMenuItems = [
    {
      label: "Toggle PDF Preview",
      shortcut: "Ctrl+P",
      action: () => {
        // Fire Ctrl+P as a key event so editorPage picks it up
        const evt = new KeyboardEvent("keydown", {
          key: "p",
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(evt);
      },
      disabled: !hasProject,
    },
    { divider: true },
    {
      label: "Zoom In",
      shortcut: "Ctrl++",
      action: () => {
        window.dispatchEvent(new CustomEvent("pdfZoomIn"));
      },
      disabled: !hasProject,
    },
    {
      label: "Zoom Out",
      shortcut: "Ctrl+-",
      action: () => {
        window.dispatchEvent(new CustomEvent("pdfZoomOut"));
      },
      disabled: !hasProject,
    },
    {
      label: "Reset Zoom",
      shortcut: "Ctrl+0",
      action: () => {
        window.dispatchEvent(new CustomEvent("resetPdfZoom"));
      },
      disabled: !hasProject,
    },
    { divider: true },
    {
      label: "Full Screen",
      shortcut: "F11",
      action: handleFullScreen,
    },
    {
      label: "Distraction Free Mode",
      shortcut: "Ctrl+Shift+F",
      action: () => {
        // Fire as keyboard event so pageLayout picks it up
        const evt = new KeyboardEvent("keydown", {
          key: "F",
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(evt);
      },
      disabled: !hasProject,
    },
  ];

  const helpMenuItems = [
    {
      label: "Getting Started",
      action: () => window.open("https://www.dociere.com/learn", "_blank"),
    },
    {
      label: "Documentation",
      action: () => window.open("https://www.dociere.com/learn", "_blank"),
    },
    {
      label: "Interactive Tour",
      action: onStartTour,
    },
    { divider: true },
    {
      label: "LaTeX Tutorials",
      action: () =>
        window.open("https://www.dociere.com/learn/latex/Tutorials", "_blank"),
    },
    {
      label: "LaTeX Reference",
      action: () =>
        window.open("https://www.dociere.com/learn/latex/Main_Page", "_blank"),
    },
    {
      label: "Math Symbols",
      action: () =>
        window.open(
          "https://www.dociere.com/learn/latex/List_of_Greek_letters_and_math_symbols",
          "_blank",
        ),
    },
    { divider: true },
    {
      label: "Keyboard Shortcuts",
      shortcut: "?",
      action: handleShowShortcuts,
    },
    // {
    //   label: "Command Palette",
    //   shortcut: "Ctrl+Shift+P",
    //   action: () => {
    //     // Open command palette
    //     setAlertModal({
    //       isOpen: true,
    //       title: "Coming Soon",
    //       message: "Command Palette - Coming in next update",
    //     });
    //   },
    // },
    { divider: true },
    {
      label: "Check for Updates",
      action: () => {
        setAlertModal({
          isOpen: true,
          title: "Up to Date",
          message: "You are using the latest version of Docière Pro v1.0",
        });
      },
    },
    {
      label: "Report an Issue",
      action: () => {
        const mailto =
          "mailto:help@dociere.com?subject=Bug Report&body=Please describe the issue:";
        window.location.href = mailto;
      },
    },
    {
      label: "Suggest a Feature",
      action: () => {
        const mailto =
          "mailto:help@dociere.com?subject=Feature Request&body=Please describe your feature idea:";
        window.location.href = mailto;
      },
    },
    { divider: true },
    {
      label: "About Docière Pro",
      action: handleAbout,
    },
  ];

  const renameTitle = async () => {
    if (!updatetitle.trim()) return;
    console.log("from renameTitle", isServerConnected);
    console.log("from renameTitle", isAuthenticated);
    const updatedProject = {
      currentProject: {
        ...projectDetails.currentProject,
        title: updatetitle,
      },
    };
    await saveProject(
      updatedProject.currentProject,
      projectDetails.currentProject.activeFile,
      undefined,
      undefined,
      isServerConnected,
      isAuthenticated,
    );
    updateProjectDetails({
      currentProject: {
        ...projectDetails.currentProject,
        title: updatetitle,
      },
    });
  };

  return (
    <>
      <div
        className="z-[10001] fixed w-full top-0 pointer-events-auto"
        style={{
          WebkitAppRegion: "drag",
        }}
        id="navbar"
      >
        <div
          className="h-7 w-full top-[3px] bottom-0 border-b-[0.5px] flex"
          style={{
            background:
              settings.appearance.customThemes[settings.appearance.theme]
                .background,
            borderColor:
              settings.appearance.customThemes[settings.appearance.theme]
                .border,
          }}
        >
          {/* Left Part - Title bar Menus */}
          <div
            className="flex flex-1 gap-7 text-[13px] pl-5 mt-1"
            style={{
              WebkitAppRegion: "no-drag",
              color:
                settings.appearance.customThemes[settings.appearance.theme]
                  .text2,
            }}
          >
            <button
              ref={(el) => (menuRefs.current.file = el)}
              onClick={(e) => handleMenuClick("file", e)}
              className={`hover:text-[#000] cursor-pointer transition-colors ${
                activeMenu === "file" ? "font-medium" : ""
              }`}
            >
              File
            </button>
            <button
              ref={(el) => (menuRefs.current.edit = el)}
              onClick={(e) => handleMenuClick("edit", e)}
              className={`hover:text-[#000] cursor-pointer transition-colors ${
                activeMenu === "edit" ? "font-medium" : ""
              }`}
            >
              Edit
            </button>
            <button
              ref={(el) => (menuRefs.current.view = el)}
              onClick={(e) => handleMenuClick("view", e)}
              className={`hover:text-[#000] cursor-pointer transition-colors ${
                activeMenu === "view" ? "font-medium" : ""
              }`}
            >
              View
            </button>
            <button
              ref={(el) => (menuRefs.current.help = el)}
              onClick={(e) => handleMenuClick("help", e)}
              className={`hover:text-[#000] cursor-pointer transition-colors ${
                activeMenu === "help" ? "font-medium" : ""
              }`}
            >
              Help
            </button>

            {/* Center Part - Branding and Project name */}
          </div>
          {projectDetails?.currentProject?.title ? (
            <div
              className="flex flex-1 py-0 text-sm font-inter font-medium justify-center"
              style={{
                WebkitAppRegion: "no-drag",
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text1,
              }}
            >
              <div
                className="flex flex-row items-center cursor-pointer select-none"
                onClick={() => setRenameProject((prev) => !prev)}
              >
                {projectDetails?.currentProject?.title}
                <EditIcon
                  style={{
                    fill: settings.appearance.customThemes[
                      settings.appearance.theme
                    ].icon1,
                    WebkitAppRegion: "no-drag",
                  }}
                  className="ml-2 w-3 h-3 relative select-none"
                />
              </div>
              {renameProject && (
                <div
                  ref={(el) => (menuRefs.current.file = el)}
                  className="absolute mt-10 bg-[#EAEAEA] px-2 py-2 border-2 border-[#CFCFCF] select-none rounded-md flex flex-row z-10"
                >
                  <input
                    className="pl-2 bg-white w-96"
                    type="text"
                    placeholder="Enter"
                    value={updatetitle}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setUpdateTitle(e.target.value)}
                  />{" "}
                  <TickIcon
                    style={{ fill: "#585858", WebkitAppRegion: "no-drag" }}
                    className="w-4 h-4 ml-2"
                    onClick={renameTitle}
                  />
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text1,
              }}
            >
              <p className="font-playfair text-sm font-medium mt-1">
                Docière Pro
              </p>
            </div>
          )}

          {/* Title Bar Control Options */}
          <div
            className="flex flex-1 justify-end"
            style={{
              WebkitAppRegion: "no-drag",
              color:
                settings.appearance.customThemes[settings.appearance.theme]
                  .text1,
            }}
          >
            <button
              className="hover:bg-gray-200 -mt-2 rounded-full px-2"
              onClick={() => window.electronAPI.minimize()}
            >
              _
            </button>

            <button
              className="hover:bg-gray-200 rounded-full px-2"
              onClick={() => window.electronAPI.maximize()}
            >
              {isMaximized ? (
                <ToMaxIcon
                  style={{
                    fill: settings.appearance.customThemes[
                      settings.appearance.theme
                    ].text1,
                  }}
                  className="w-4 h-4 rotate-180"
                />
              ) : (
                <ToMinIcon
                  style={{
                    fill: settings.appearance.customThemes[
                      settings.appearance.theme
                    ].text1,
                  }}
                  className="w-4 h-4 rotate-180"
                />
              )}
            </button>
            <button
              className="hover:bg-gray-200 rounded-full px-2 text-[#0a0a0a]"
              style={{
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text2,
              }}
              onClick={() => window.electronAPI.close()}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Dropdown Menus */}
        <MenuDropdown
          isOpen={activeMenu === "file"}
          onClose={() => setActiveMenu(null)}
          items={fileMenuItems}
          position={menuPosition}
        />
        <MenuDropdown
          isOpen={activeMenu === "edit"}
          onClose={() => setActiveMenu(null)}
          items={editMenuItems}
          position={menuPosition}
        />
        <MenuDropdown
          isOpen={activeMenu === "view"}
          onClose={() => setActiveMenu(null)}
          items={viewMenuItems}
          position={menuPosition}
        />
        <MenuDropdown
          isOpen={activeMenu === "help"}
          onClose={() => setActiveMenu(null)}
          items={helpMenuItems}
          position={menuPosition}
        />
      </div>

      {/* Shortcuts Modal */}
      {showShortcutsModal && (
        <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {/* Save as Template Modal */}
      {showSaveTemplateModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
          onClick={() => setShowSaveTemplateModal(false)}
        >
          <div
            className="rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            style={{
              background:
                settings.appearance.customThemes[settings.appearance.theme]
                  .background,
              border: `1px solid ${settings.appearance.customThemes[settings.appearance.theme].border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-xl font-inter font-semibold mb-1"
              style={{
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text1,
              }}
            >
              Save as Template
            </h3>
            <p
              className="text-sm font-inter mb-5"
              style={{
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text3,
              }}
            >
              All project files will be saved as a reusable template.
            </p>

            <label
              className="block text-sm font-inter font-medium mb-2"
              style={{
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text2,
              }}
            >
              Template Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveAsTemplate();
              }}
              placeholder="e.g. My Research Paper"
              autoFocus
              className="w-full px-3 py-2 rounded border outline-none text-sm font-inter mb-6"
              style={{
                background:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .background,
                borderColor:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .border,
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text1,
              }}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName("");
                }}
                className="px-4 py-2 rounded text-sm font-inter font-medium transition-colors hover:opacity-80"
                style={{
                  color:
                    settings.appearance.customThemes[settings.appearance.theme]
                      .text2,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={!templateName.trim()}
                className="px-4 py-2 rounded text-sm font-inter font-medium text-white transition-colors"
                style={{
                  background: templateName.trim() ? "#AB2D2D" : "#ccc",
                  cursor: templateName.trim() ? "pointer" : "not-allowed",
                }}
              >
                Save as Local Template
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showCloseConfirm}
        onConfirm={confirmClose}
        onCancel={() => setShowCloseConfirm(false)}
        title="Close Project"
        message="Are you sure you want to close this project? Unsaved changes will be lost."
        confirmText="Close Project"
        isDanger={true}
      />
    </>
  );
};

export default NavBar;
