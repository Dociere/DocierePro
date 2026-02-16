import SideBar from "../components/sideBar";
import SectionSpace from "../components/sectionSpace";
import NavBar from "../components/navBar";
import { Outlet, useLocation } from "react-router-dom";
import StatusBar from "../components/statusBar";
import { useState, useEffect } from "react";
import { startTour, syncTourWithRoute } from "../utils/tour";

const PageLayout = () => {
  const location = useLocation();
  const [isSectionSpaceOpen, setIsSectionSpaceOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // Sync tour with current route
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

  const handleStartTour = () => {
    startTour();
  };

  const handleOpenAIChat = () => {
    setIsAIChatOpen(true);
  };

  return (
    <>
      <NavBar onStartTour={handleStartTour} />
      <div className="flex flex-row">
        <div>
          <SideBar
            isSectionSpaceOpen={isSectionSpaceOpen}
            setIsSectionSpaceOpen={setIsSectionSpaceOpen}
            onOpenAIChat={handleOpenAIChat}
          />
        </div>
        <div>{isSectionSpaceOpen && <SectionSpace />}</div>
        <div className="w-full h-auto">
          <Outlet
            context={{ isSectionSpaceOpen, isAIChatOpen, setIsAIChatOpen }}
          />
        </div>
      </div>
      <StatusBar />
    </>
  );
};

export default PageLayout;
