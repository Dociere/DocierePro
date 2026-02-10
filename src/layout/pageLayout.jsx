import React from "react";
import SideBar from "../components/sideBar";
import SectionSpace from "../components/sectionSpace";
import NavBar from "../components/navBar";
import { Outlet } from "react-router-dom";
import StatusBar from "../components/statusBar";
import { useState } from "react";
import { useSettings } from "../context/useSettings";

const PageLayout = () => {
  const [isSectionSpaceOpen, setIsSectionSpaceOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const { settings } = useSettings();

  const handleOpenAIChat = () => {
    setIsAIChatOpen(true);
  };

  return (
    <div
      style={{
        background:
          settings.appearance.customThemes[settings.appearance.theme].surface,
      }}
    >
      <NavBar />
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
    </div>
  );
};

export default PageLayout;
