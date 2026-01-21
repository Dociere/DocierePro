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
import ExtensionIcon from "../assets/icons/extensionIcon.svg?react";
import CompileIcon from "../assets/icons/compileIcon.svg?react";
import SettingsIcon from "../assets/icons/settings.svg?react";
import UserIcon from "../assets/icons/user.svg?react";
import LogoutIcon from "../assets/icons/logout.svg?react";
import DraftVersionIcon from "../assets/icons/draftVersion.svg?react";
import SectionSpace from "./sectionSpace";
import { projectContext } from "../context/useProject";
import { useSettings } from "../context/useSettings";
import { compileDocument } from "../api/projectHandling";
import { useAuth } from "../context/useAuth";
import axios from "axios";
const DynamicSideBar = ({ isSectionSpaceOpen, setIsSectionSpaceOpen }) => {
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isProfileActive, setIsProfileActive] = useState(false);

  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const {
    currentProject,
    activeFile,
    isCompiling,
    compilationStatus,
    compilationMessage,
    pdfUrl,
    latexContent,
  } = projectDetails;
  const { user, isServerConnected, isAuthenticated } = useAuth();
  const { settings } = useSettings();

  const isDark = settings.appearance.mode === "dark";

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
      isAuthenticated
    );

    updateProjectDetails({
      pdfUrl: response.pdfUrl,
      compilationStatus: response.compilationStatus,
      compilationMessage: response.compilationMessage,
    });
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
        { withCredentials: true }
      );
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
      <div className={`h-[calc(100vh-4rem)] w-12 fixed top-11 left-0 z-40 border-r-[1px] select-none transition-colors duration-300 ${isDark ? 'bg-[#252525] border-[#404040]' : 'bg-[#F9F9F9] border-[#CFCFCF]'
        }`}>
        <div className="flex flex-col justify-between h-full">
          <div className="flex flex-col items-center pt-4 space-y-3">
            {/* Home / Dashboard */}
            <Link to="/">
              <span
                className={`flex items-center justify-center cursor-pointer p-2 transition-colors rounded-md ${isDark ? 'text-[#a0a0a0] hover:bg-[#404040]' : 'text-[#585858] hover:bg-gray-200'
                  }`}
                title="Home Dashboard"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              </span>
            </Link>

            <div className={`w-8 h-[1px] ${isDark ? 'bg-[#404040]' : 'bg-[#CFCFCF]'}`} />

            {/* Current Project file */}
            <Link to={currentProject ? `/canvas?project=${currentProject.id}` : "/template"}>
              <span
                className={`flex items-center justify-center cursor-pointer p-2 transition-colors rounded-md ${isDark ? 'text-[#a0a0a0] hover:bg-[#404040]' : 'text-[#585858] hover:bg-gray-200'
                  }`}
                title="Active Canvas"
              >
                <DraftIcon style={{ fill: isDark ? "#a0a0a0" : "#585858" }} className="w-4 h-4" />
              </span>
            </Link>
            {/* Section Space */}
            <div onClick={toggleSectionSpace}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer relative group"
                title="Section Space"
              >
                <div className={`p-3 rounded-md transition-colors ${isDark ? 'hover:bg-[#404040]' : 'hover:bg-gray-200'}`}>
                  <SectionIcon
                    style={{ fill: isDark ? "#a0a0a0" : "#585858" }}
                    className="w-4 h-4"
                  />
                </div>
              </span>
            </div>

            {/* Citation Manager */}
            <div className="relative group">
              <Link onClick={handleCitationIconClick}>
                <div
                  className={`flex items-center justify-center cursor-pointer p-2 transition-colors rounded-md ${isDark ? 'text-[#a0a0a0] hover:bg-[#404040]' : 'text-[#585858] hover:bg-gray-200'
                    }`}
                  title="Citation Manager"
                >
                  <CitationIcon
                    style={{ fill: isDark ? "#a0a0a0" : "#585858" }}
                    className="w-4 h-4"
                  />
                </div>
              </Link>
            </div>

            {/* Share / Collaborate */}
            <div onClick={handleShareIconClick}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Share"
              >
                <ShareIcon style={{ fill: isDark ? "#a0a0a0" : "#585858" }} className="w-4 h-4" />
              </span>
            </div>

            {/* Easy Math Input */}
            <Link onClick={handleMathIconClick}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Easy Math Input"
              >
                <MathIcon style={{ fill: isDark ? "#a0a0a0" : "#585858" }} className="w-4 h-4" />
              </span>
            </Link>

            {/* Extensions */}
            <Link to={currentProject ? `/canvas?project=${currentProject.id}` : "/template"}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Extensions"
              >
                <ExtensionIcon
                  style={{ fill: isDark ? "#a0a0a0" : "#585858" }}
                  className="w-4 h-4"
                />
              </span>
            </Link>

            {/* Draft Versioning */}
            <div onClick={() => setIsVersionModalOpen(true)}>
              <span
                className={`flex items-center justify-center cursor-pointer p-2 transition-colors rounded-md relative group ${isDark ? 'hover:bg-[#404040]' : 'hover:bg-gray-200'
                  }`}
                title="Draft Versioning"
              >
                <DraftVersionIcon
                  style={{ fill: isDark ? "#a0a0a0" : "#585858" }}
                  className="w-4 h-4"
                />
              </span>
            </div>

            {/* Compile */}
            <div onClick={handleCompile}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Compile"
              >
                {projectDetails.compilationStatus === "error" ? (
                  <div className="text-xl text-[#ff0000]">►</div>
                ) : projectDetails.compilationStatus === "success" ? (
                  <div className="text-xl text-[#16be00]">►</div>
                ) : (
                  <div className="text-xl text-[#929292]">►</div>
                )}
              </span>
            </div>
          </div>
          <div className="flex flex-col mb-2">
            {/* Settings */}
            <Link to="/settings">
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Settings"
              >
                <SettingsIcon style={{ fill: isDark ? "#a0a0a0" : "#585858" }} className="w-5 h-5" />
              </span>
            </Link>
            {/* User Profile */}
            <Link onClick={handleProfileIconClick}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Account"
              >
                {user?.userName ? (
                  <span className={isDark ? "text-[#e5e5e5]" : "text-black"}>
                    {user?.userName
                      .split(" ")
                      .map((word) => word[0])
                      .join("")}
                  </span>
                ) : (
                  <UserIcon style={{ fill: isDark ? "#a0a0a0" : "#585858" }} className="w-5 h-5" />
                )}
              </span>
              {isProfileActive &&
                (user?.userId ? (
                  <div className={`absolute ml-14 z-50 bottom-4 h-20 min-w-40 w-auto border-[1px] transition-colors ${isDark ? 'bg-[#2d2d2d] border-[#404040]' : 'bg-[#F9F9F9] border-[#CFCFCF]'
                    }`}>
                    <div className="font-inter py-3">
                      <p className={`text-[0.8rem] px-3 ${isDark ? 'text-[#a0a0a0]' : 'text-[#A3A3A3]'}`}>
                        {user?.emailId}
                      </p>
                      <div className={`mt-1 w-40 h-[1px] ${isDark ? 'bg-[#404040]' : 'bg-[#CFCFCF]'}`}></div>
                      <div
                        onClick={handleLogout}
                        className={`flex flex-row justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-[#404040]' : 'hover:bg-gray-100'
                          }`}
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
                  <div className={`absolute ml-14 z-50 bottom-4 h-10 w-40 border-[1px] transition-colors ${isDark ? 'bg-[#2d2d2d] border-[#404040]' : 'bg-[#F9F9F9] border-[#CFCFCF]'
                    }`}>
                    <div className="font-inter py-2">
                      <Link to="/signup">
                        <div className={`flex flex-row justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-[#404040]' : 'hover:bg-gray-100'
                          }`}>
                          <p className={`px-3 text-sm font-normal ${isDark ? 'text-[#e5e5e5]' : 'text-black'}`}>
                            Sign In
                          </p>
                          <span className={`text-sm mr-4 ${isDark ? 'text-[#e5e5e5]' : 'text-black'}`}> {"->"} </span>
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

      {/* {isSectionSpaceOpen && <SectionSpace />} */}
    </>
  );
};

export default DynamicSideBar;
