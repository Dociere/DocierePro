import React from "react";
import SideBar from "../components/sideBar";
import SectionSpace from "../components/sectionSpace";
import NavBar from "../components/navBar";
import { Outlet, useLocation } from "react-router-dom";
import StatusBar from "../components/statusBar";
import ExtensionHost from "../services/ExtensionHost";
import { useState, useEffect, useRef, useCallback, useContext } from "react";
import { projectContext } from "../context/useProject";
import { startTour, syncTourWithRoute } from "../utils/tour";
import { useSettings } from "../context/useSettings";

const PageLayout = () => {
  const location = useLocation();
  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const isSectionSpaceOpen = projectDetails.isSectionSpaceOpen;
  
  const setIsSectionSpaceOpen = (val) => {
    updateProjectDetails({
      isSectionSpaceOpen: typeof val === "function" ? val(isSectionSpaceOpen) : val
    });
  };

  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [isExtensionPanelOpen, setIsExtensionPanelOpen] = useState(false);
  const [activeExtensionId, setActiveExtensionId] = useState(null);
  const [sectionSpaceWidth, setSectionSpaceWidth] = useState(256); // default 256px (w-64)
  const { settings } = useSettings();

  useEffect(() => {
    const handleToggle = (e) => {
      const { id, visible } = e.detail;
      setIsExtensionPanelOpen(visible);
      setActiveExtensionId(visible ? id : null);
    };
    window.addEventListener("dociere-toggle-extension", handleToggle);
    return () => window.removeEventListener("dociere-toggle-extension", handleToggle);
  }, []);

  const isDraggingSection = useRef(false);
  const sectionDragStartX = useRef(0);
  const sectionDragStartWidth = useRef(256);

  useEffect(() => {
    syncTourWithRoute(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const isCompleted = localStorage.getItem("dociere_tour_completed");
    if (!isCompleted) {
      const timer = setTimeout(() => {
        startTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Distraction Free Mode keyboard shortcut
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setIsDistractionFree((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleStartSectionDrag = useCallback((e) => {
    e.preventDefault();
    isDraggingSection.current = true;
    sectionDragStartX.current = e.clientX;
    sectionDragStartWidth.current = sectionSpaceWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent) => {
      if (!isDraggingSection.current) return;
      const delta = moveEvent.clientX - sectionDragStartX.current;
      const newWidth = Math.min(480, Math.max(160, sectionDragStartWidth.current + delta));
      setSectionSpaceWidth(newWidth);
    };

    const onMouseUp = () => {
      isDraggingSection.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [sectionSpaceWidth]);

  const handleStartTour = () => { startTour(); };
  const handleOpenAIChat = () => { setIsAIChatOpen(true); };

  return (
    <div
      style={{
        background:
          settings.appearance.customThemes[settings.appearance.theme].surface,
      }}
    >
      {/* NavBar — hidden in distraction free mode */}
      {!isDistractionFree && <NavBar onStartTour={handleStartTour} />}

      <div className="flex flex-row">
        {/* Sidebar — hidden in distraction free mode */}
        {!isDistractionFree && (
          <div>
            <SideBar
              isSectionSpaceOpen={isSectionSpaceOpen}
              setIsSectionSpaceOpen={setIsSectionSpaceOpen}
              onOpenAIChat={handleOpenAIChat}
            />
          </div>
        )}

        {/* Section Space panel with resize handle */}
        {!isDistractionFree && isSectionSpaceOpen && (
          <SectionSpace width={sectionSpaceWidth} onDragStart={handleStartSectionDrag} />
        )}

        {/* Extension Panel (Dynamic Drawer) */}
        <div 
          className={`h-[calc(100vh-3rem)] flex flex-col transition-all duration-300 ease-in-out ${
            !isDistractionFree && isExtensionPanelOpen ? "w-[300px] border-r" : "w-0 border-none overflow-hidden"
          }`}
          style={{ 
            backgroundColor: settings.appearance.customThemes[settings.appearance.theme].background,
            borderColor: settings.appearance.customThemes[settings.appearance.theme].border
          }}
        >
          <div className="p-4 border-b flex items-center justify-between min-w-[300px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Extension View</h3>
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent("dociere-toggle-extension", { 
                  detail: { id: activeExtensionId, visible: false } 
                }));
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden relative min-w-[300px]">
            <ExtensionHost activeExtensionId={activeExtensionId} />
          </div>
        </div>

        <div className="w-full h-auto">
          <Outlet
            context={{
              isSectionSpaceOpen,
              isAIChatOpen,
              setIsAIChatOpen,
              isDistractionFree,
              sectionSpaceWidth,
            }}
          />
        </div>
      </div>

      {/* StatusBar — hidden in distraction free mode */}
      {!isDistractionFree && <StatusBar />}
    </div>
  );
};

export default PageLayout;
