import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "./searchBar";
import MenuDropdown from "./menuDropdown";
import ShortcutsModal from "./shortcutsModal";
import { projectContext } from "../context/useProject";
import EditIcon from "../assets/icons/edit.svg?react";
import TickIcon from "../assets/icons/tickIcon.svg?react";
import dociereLogo from "../../public/dociere.png";
import ToMaxIcon from "../assets/icons/minmaxIcon.svg?react";
import ToMinIcon from "../assets/icons/minmaxIcon1.svg?react";
import axios from "axios";

const API_URL = "http://localhost:5000";

const NavBar = () => {
  const navigate = useNavigate();
  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [renameProject, setRenameProject] = useState(false);
  const [updatetitle, setUpdateTitle] = useState("");
  const menuRefs = useRef({});

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

  const handleSaveProject = async () => {
    if (!projectDetails.currentProject || !projectDetails.activeFile) {
      alert("No project to save");
      return;
    }

    try {
      await axios.put(
        `${API_URL}/api/projects/${projectDetails.currentProject.id}`,
        {
          files: projectDetails.currentProject.files,
          activeFile: projectDetails.activeFile,
        },
      );

      updateProjectDetails({
        compilationStatus: "success",
        compilationMessage: "Project saved successfully!",
      });

      setTimeout(() => {
        updateProjectDetails({
          compilationStatus: "",
          compilationMessage: "",
        });
      }, 2000);
    } catch (error) {
      console.error("Save failed:", error);
      updateProjectDetails({
        compilationStatus: "error",
        compilationMessage: "Failed to save project",
      });

      setTimeout(() => {
        updateProjectDetails({
          compilationStatus: "",
          compilationMessage: "",
        });
      }, 3000);
    }
  };

  const handleSaveAs = async () => {
    if (!projectDetails.currentProject) {
      alert("No project to save");
      return;
    }

    const newTitle = prompt(
      "Enter new project title:",
      `${projectDetails.currentProject.title} - Copy`,
    );

    if (!newTitle || newTitle.trim() === "") {
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/projects`, {
        title: newTitle.trim(),
        template: projectDetails.currentProject.template,
        files: projectDetails.currentProject.files,
      });

      updateProjectDetails({
        currentProject: response.data.project,
        compilationStatus: "success",
        compilationMessage: `Project saved as "${newTitle}"`,
      });

      setTimeout(() => {
        updateProjectDetails({
          compilationStatus: "",
          compilationMessage: "",
        });
      }, 2000);

      navigate("/canvas");
    } catch (error) {
      console.error("Save As failed:", error);
      updateProjectDetails({
        compilationStatus: "error",
        compilationMessage: "Failed to save project as new",
      });

      setTimeout(() => {
        updateProjectDetails({
          compilationStatus: "",
          compilationMessage: "",
        });
      }, 3000);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S or Cmd+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasProject) {
          handleSaveProject();
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
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
        e.preventDefault();
        if (hasProject) {
          handleSaveAs();
        }
      }

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

  const handleExportPDF = () => {
    if (!projectDetails.pdfUrl) {
      alert("Please compile your document first to generate a PDF");
      return;
    }

    // Trigger PDF download
    const link = document.createElement("a");
    link.href = projectDetails.pdfUrl;
    link.download = `${projectDetails.currentProject?.title || "document"}.pdf`;
    link.click();

    alert("PDF download started!");
  };

  const handleCloseProject = () => {
    if (
      window.confirm(
        "Are you sure you want to close this project? Unsaved changes will be lost.",
      )
    ) {
      updateProjectDetails({
        currentProject: null,
        activeFile: null,
        latexContent: "",
        richTextContent: "",
        pdfUrl: "",
      });
      navigate("/");
    }
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
    alert(
      "Docière Pro v1.0\nLaTeX Editor Redefined\n\n" +
        "A modern LaTeX editor with intuitive interfaces:\n" +
        "• Full Code View with Monaco Editor\n" +
        "• Rich Text Editor for WYSIWYG editing\n" +
        "• Section-based editing for structured documents\n\n" +
        "Created with ❤️ for seamless document creation",
    );
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
    {
      label: "Save As...",
      shortcut: "Ctrl+Shift+S",
      action: handleSaveAs,
      disabled: !hasProject,
    },
    { divider: true },
    {
      label: "Export as PDF",
      action: handleExportPDF,
      disabled: !hasProject || !projectDetails.pdfUrl,
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
      label: "Code View",
      shortcut: "Ctrl+1",
      action: () => handleSwitchView("code"),
      disabled: !hasProject,
    },
    {
      label: "Text View",
      shortcut: "Ctrl+2",
      action: () => handleSwitchView("text"),
      disabled: !hasProject,
    },
    {
      label: "Section View",
      shortcut: "Ctrl+3",
      action: () => handleSwitchView("section"),
      disabled: !hasProject,
    },
    { divider: true },
    {
      label: projectDetails.isSectionSpaceOpen
        ? "Hide Section Space"
        : "Show Section Space",
      shortcut: "Ctrl+B",
      action: handleToggleSectionSpace,
      disabled: !hasProject,
    },
    {
      label: "Toggle PDF Preview",
      shortcut: "Ctrl+P",
      action: () => {
        // Toggle PDF preview panel
        updateProjectDetails({
          showPdfPreview: !projectDetails.showPdfPreview,
        });
      },
      disabled: !hasProject,
    },
    { divider: true },
    {
      label: "Zoom In",
      shortcut: "Ctrl++",
      action: () => {
        // Apply zoom to editor content
        const editorElement = document.querySelector(
          ".monaco-editor, .text-editor",
        );
        if (editorElement) {
          const currentZoom = parseFloat(editorElement.style.zoom || "1");
          editorElement.style.zoom = (currentZoom + 0.1).toString();
        }
      },
      disabled: !hasProject,
    },
    {
      label: "Zoom Out",
      shortcut: "Ctrl+-",
      action: () => {
        const editorElement = document.querySelector(
          ".monaco-editor, .text-editor",
        );
        if (editorElement) {
          const currentZoom = parseFloat(editorElement.style.zoom || "1");
          editorElement.style.zoom = Math.max(
            0.5,
            currentZoom - 0.1,
          ).toString();
        }
      },
      disabled: !hasProject,
    },
    {
      label: "Reset Zoom",
      shortcut: "Ctrl+0",
      action: () => {
        const editorElement = document.querySelector(
          ".monaco-editor, .text-editor",
        );
        if (editorElement) {
          editorElement.style.zoom = "1";
        }
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
        // Hide all UI except editor
        updateProjectDetails({
          isDistractionFree: !projectDetails.isDistractionFree,
        });
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
    {
      label: "Table Generator",
      action: () =>
        window.open("https://www.tablesgenerator.com/latex_tables", "_blank"),
    },
    { divider: true },
    {
      label: "Keyboard Shortcuts",
      shortcut: "?",
      action: handleShowShortcuts,
    },
    {
      label: "Command Palette",
      shortcut: "Ctrl+Shift+P",
      action: () => {
        // Open command palette
        alert("Command Palette - Coming in next update");
      },
    },
    { divider: true },
    {
      label: "Check for Updates",
      action: () => {
        alert("You are using the latest version of Docière Pro v1.0");
      },
    },
    {
      label: "Report an Issue",
      action: () => {
        const mailto =
          "mailto:support@dociere.pro?subject=Bug Report&body=Please describe the issue:";
        window.location.href = mailto;
      },
    },
    {
      label: "Suggest a Feature",
      action: () => {
        const mailto =
          "mailto:support@dociere.pro?subject=Feature Request&body=Please describe your feature idea:";
        window.location.href = mailto;
      },
    },
    { divider: true },
    {
      label: "About Docière Pro",
      action: handleAbout,
    },
  ];

  return (
    <>
      <div
        className="z-50 fixed w-full top-0 "
        style={{
          WebkitAppRegion: "drag",
        }}
      >
        <div className="bg-[#F9F9F9] h-11 w-full top-[3px] bottom-0 border-b-[0.5px] border-[#CFCFCF] flex">
          {/* Left Part - Title bar Menus */}
          <div
            className="flex flex-1 gap-7 text-sm pl-5 text-[#212121]"
            style={{ WebkitAppRegion: "no-drag" }}
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
              onClick={() => setRenameProject((prev) => !prev)}
              className="flex flex-1 py-0 text-sm font-inter font-medium flex-row justify-center items-center cursor-pointer"
              style={{ WebkitAppRegion: "no-drag" }}
            >
              {projectDetails?.currentProject?.title}
              <EditIcon
                style={{ fill: "#585858", WebkitAppRegion: "no-drag" }}
                className="ml-2 w-3 h-3 relative select-none"
              />
              {renameProject && (
                <div className="absolute mt-20 bg-[#EAEAEA] px-2 py-2 border-2 border-[#CFCFCF] select-none rounded-md flex flex-row z-10">
                  <input
                    className="pl-2 bg-white w-96"
                    type="text"
                    placeholder="Enter"
                    value={updatetitle}
                    onChange={(e) => setUpdateTitle(e.target.value)}
                  />{" "}
                  <TickIcon
                    style={{ fill: "#585858", WebkitAppRegion: "no-drag" }}
                    className="w-4 h-4 ml-2"
                    onClick={() =>
                      updateProjectDetails({
                        currentProject: {
                          ...projectDetails.currentProject,
                          title: updatetitle,
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <img src={dociereLogo} alt="" className="w-[5.2vw] mt-2" />
            </div>
          )}

          {/* Title Bar Control Options */}
          <div
            className="flex flex-1 justify-end"
            style={{ WebkitAppRegion: "no-drag" }}
          >
            <button
              className="hover:bg-gray-200 my-2 rounded-md px-3"
              onClick={() => window.electronAPI.minimize()}
            >
              _
            </button>

            <button
              className="hover:bg-gray-200 my-2 rounded-md px-3"
              onClick={() => window.electronAPI.maximize()}
            >
              {isMaximized ? (
                <ToMaxIcon
                  style={{ fill: "#000000" }}
                  className="w-4 h-4 rotate-180"
                />
              ) : (
                <ToMinIcon
                  style={{ fill: "#000000" }}
                  className="w-4 h-4 rotate-180"
                />
              )}
            </button>
            <button
              className="hover:bg-gray-200 my-2 rounded-md px-3 text-[#0a0a0a]"
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
    </>
  );
};

export default NavBar;
