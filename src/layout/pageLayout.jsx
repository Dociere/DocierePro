import React from "react";
import SideBar from "../components/sideBar";
import SectionSpace from "../components/sectionSpace";
import NavBar from "../components/navBar";
import { Outlet, useLocation } from "react-router-dom";
import StatusBar from "../components/statusBar";
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
  const [sectionSpaceWidth, setSectionSpaceWidth] = useState(256); // default 256px (w-64)
  const { settings } = useSettings();

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
