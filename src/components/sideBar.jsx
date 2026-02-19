import React, { useState, useContext } from "react";
import { Link } from "react-router-dom";
import EasyMathInput from "./easyMathInput";
import CitationManager from "./citationManager";
import ShareProject from "./shareProject";
import VersionManager from "./versionManager";
import SectionIcon from "../assets/icons/sectionIcon.svg?react";
import CitationIcon from "../assets/icons/citation-manager.svg?react";
import ShareIcon from "../assets/icons/shareIcon.svg?react";
import DraftIcon from "../assets/icons/draftIcon.svg?react";
import MathIcon from "../assets/icons/mathIcon.svg?react";
import DraftVersionIcon from "../assets/icons/draftVersion.svg?react";
import ExtensionIcon from "../assets/icons/extensionIcon.svg?react";
import SettingsIcon from "../assets/icons/settings.svg?react";
import UserIcon from "../assets/icons/user.svg?react";
import LogoutIcon from "../assets/icons/logout.svg?react";
import SectionSpace from "./sectionSpace";
import { projectContext } from "../context/useProject";
import { useAuth } from "../context/useAuth";
import axios from "axios";
import { useSettings } from "../context/useSettings";

const DynamicSideBar = ({
  isSectionSpaceOpen,
  setIsSectionSpaceOpen,
  onOpenAIChat,
}) => {
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isProfileActive, setIsProfileActive] = useState(false);
  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const { user, isServerConnected } = useAuth();
  const { settings } = useSettings();

  console.log("user", user);
  console.log("isServerConnected", isServerConnected);
  console.log("projectDetails", projectDetails);

  const handleMathIconClick = (e) => {
    e.preventDefault();
    setIsMathModalOpen(true);
  };

  const handleShareIconClick = (e) => {
    e.preventDefault();
    setIsShareModalOpen(true);
  };

  const handleProfileIconClick = (e) => {
    e.preventDefault();
    setIsProfileActive((prev) => !prev);
  };

  const handleCitationIconClick = (e) => {
    e.preventDefault();
    setIsCitationModalOpen(true);
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${import.meta.env.VITE_admin_server}/api/signout`,
        {},
        { withCredentials: true },
      );
      console.log("Successfully Logged Out");
      window.location.reload();
    } catch (error) {
      console.log("Logout Error:", error);
    }
  };

  const toggleSectionSpace = () => {
    setIsSectionSpaceOpen(!isSectionSpaceOpen);
  };
  return (
    <>
      <div
        className="h-[calc(100vh-3rem)] w-10 fixed top-7 left-0 z-40 border-r-[1px] select-none"
        style={{
          background:
            settings.appearance.customThemes[settings.appearance.theme]
              .background,
          borderColor:
            settings.appearance.customThemes[settings.appearance.theme].border,
        }}
      >
        <div className="flex flex-col justify-between h-full">
          <div className="flex flex-col items-center pt-4 space-y-1">
            {/* Current Project file */}
            <Link
              id="tour-project-file"
              to={`/canvas?project=${projectDetails?.currentProject?.id}`}
            >
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer relative group"
                title="Current Project file"
              >
                <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                  <DraftIcon
                    style={{
                      fill: settings.appearance.customThemes[
                        settings.appearance.theme
                      ].icon1,
                    }}
                    className="w-4 h-4"
                  />
                </div>
              </span>
            </Link>
            {/* Section Space */}
            <div id="tour-section-space" onClick={toggleSectionSpace}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer relative group"
                title="Section Space"
              >
                <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                  <SectionIcon
                    style={{
                      fill: settings.appearance.customThemes[
                        settings.appearance.theme
                      ].icon1,
                    }}
                    className="w-4 h-4"
                  />
                </div>
              </span>
            </div>

            {/* Citation Manager */}
            <div id="tour-citation-manager" className="relative group">
              <Link onClick={handleCitationIconClick}>
                <div
                  className="flex items-center justify-center text-[#585858] cursor-pointer"
                  title="Citation Manager"
                >
                  <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                    <CitationIcon
                      style={{
                        fill: settings.appearance.customThemes[
                          settings.appearance.theme
                        ].icon1,
                      }}
                      className="w-4 h-4 "
                    />
                  </div>
                </div>
              </Link>
            </div>

            {/* Share / Collaborate */}
            <div id="tour-share" onClick={handleShareIconClick}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer relative group"
                title="Share"
              >
                <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                  <ShareIcon
                    style={{
                      fill: settings.appearance.customThemes[
                        settings.appearance.theme
                      ].icon1,
                    }}
                    className="w-4 h-4"
                  />
                </div>
              </span>
            </div>

            {/* Equation Generator */}
            <Link id="tour-math-input" onClick={handleMathIconClick}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer relative group"
                title="Equation Generator"
              >
                <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                  <MathIcon
                    style={{
                      fill: settings.appearance.customThemes[
                        settings.appearance.theme
                      ].icon1,
                    }}
                    className="w-4 h-4"
                  />
                </div>
              </span>
            </Link>

            {/* Extensions */}
            <Link id="tour-extensions" to="/canvas">
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer relative group"
                title="Extensions"
              >
                <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                  <ExtensionIcon
                    style={{
                      fill: settings.appearance.customThemes[
                        settings.appearance.theme
                      ].icon1,
                    }}
                    className="w-4 h-4"
                  />
                </div>
              </span>
            </Link>

            {/* Draft Versioning */}
            <div
              id="tour-versioning"
              onClick={() => setIsVersionModalOpen(true)}
            >
              <span
                className={`flex items-center justify-center cursor-pointer transition-colors rounded-md relative group`}
                title="Draft Versioning"
              >
                <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                  <DraftVersionIcon
                    style={{
                      fill: settings.appearance.customThemes[
                        settings.appearance.theme
                      ].icon1,
                    }}
                    className="w-4 h-4"
                  />
                </div>
              </span>
            </div>

            {/* AI Chat */}
            <div id="tour-ai-chat" onClick={onOpenAIChat}>
              <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                <span
                  className={`flex items-center justify-center cursor-pointer transition-colors rounded-md relative group font-poppins text-sm p-0 m-0`}
                  title="AI Chat"
                  style={{
                    color:
                      settings.appearance.customThemes[
                        settings.appearance.theme
                      ].icon1,
                  }}
                >
                  AI
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col mb-2">
            {/* Settings */}
            <Link id="tour-settings" to="/settings">
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Settings"
              >
                <SettingsIcon
                  style={{
                    fill: settings.appearance.customThemes[
                      settings.appearance.theme
                    ].icon1,
                  }}
                  className="w-5 h-5"
                />
              </span>
            </Link>
            {/* User Profile */}
            <Link id="tour-account" onClick={handleProfileIconClick}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Account"
              >
                {user?.userName ? (
                  <span>
                    {user?.userName
                      .split(" ")
                      .map((word) => word[0])
                      .join("")}
                  </span>
                ) : (
                  <UserIcon
                    style={{
                      fill: settings.appearance.customThemes[
                        settings.appearance.theme
                      ].icon1,
                    }}
                    className="w-5 h-5"
                  />
                )}
              </span>
              {isProfileActive &&
                (user?.userId ? (
                  <div className="absolute ml-14 z-50 bottom-4 h-20 min-w-40 w-auto bg-[#F9F9F9] border-[#CFCFCF] border-[1px]">
                    <div className="font-inter py-3">
                      <p className="text-[0.8rem] text-[#A3A3A3] px-3">
                        {user?.emailId}
                      </p>
                      <div className="mt-1 w-40 h-[1px] bg-[#CFCFCF]"></div>
                      <div
                        onClick={handleLogout}
                        className="flex flex-row justify-between"
                      >
                        <p className="px-3 text-sm mt-3 text-red-500 font-normal">
                          Logout
                        </p>
                        <LogoutIcon
                          style={{ fill: "#C01A1A" }}
                          className="w-4 h-4 mt-[2vh] mr-4"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute ml-14 z-50 bottom-4 h-10 w-40 bg-[#F9F9F9] border-[#CFCFCF] border-[1px]">
                    <div className="font-inter py-2">
                      <Link to="/signup">
                        <div className="flex flex-row justify-between">
                          <p className="px-3 text-sm text-black font-normal">
                            Sign In
                          </p>
                          <span className="text-sm mr-4"> {"->"} </span>
                        </div>
                      </Link>
                    </div>
                  </div>
                ))}
            </Link>
          </div>
        </div>
      </div>

      {/* Easy Math Input Modal */}
      {isMathModalOpen && (
        <EasyMathInput onClose={() => setIsMathModalOpen(false)} />
      )}

      {/* Citation Manager Modal */}
      {isCitationModalOpen && (
        <CitationManager onClose={() => setIsCitationModalOpen(false)} />
      )}

      {/* Share Project Modal */}
      {isShareModalOpen && (
        <ShareProject
          onClose={() => setIsShareModalOpen(false)}
          projectId={projectDetails?.currentProject?.id}
          isOwner={projectDetails?.currentProject?.owner}
        />
      )}

      {/* Versioning Manager Modal */}
      {isVersionModalOpen && (
        <VersionManager onClose={() => setIsVersionModalOpen(false)} />
      )}

      {isSectionSpaceOpen && <SectionSpace />}
    </>
  );
};

export default DynamicSideBar;
