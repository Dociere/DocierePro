import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import EasyMathInput from "./easyMathInput";
import CitationManager from "./citationManager";
import ShareProject from "./shareProject";
import VersionManager from "./versionManager";
import TableDesignerModal from "./TableDesignerModal";
import ImageInsertModal from "./ImageInsertModal";
import Extensions from "./extensions";
import { FiBox } from "react-icons/fi";
import FileOpen from "../assets/icons/fileOpen.svg?react";
import SectionIcon from "../assets/icons/sectionIcon.svg?react";
import CitationIcon from "../assets/icons/citation-manager.svg?react";
import ShareIcon from "../assets/icons/shareIcon.svg?react";
import DraftIcon from "../assets/icons/draftIcon.svg?react";
import MathIcon from "../assets/icons/mathIcon.svg?react";
import TableIcon from "../assets/icons/tableIcon.svg?react";
import ImageIcon from "../assets/icons/imageIcon.svg?react";
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
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isExtensionsModalOpen, setIsExtensionsModalOpen] = useState(false);
  const [isProfileActive, setIsProfileActive] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const { user, isServerConnected, isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [extensionViews, setExtensionViews] = useState([]);
  const [activeExtensionId, setActiveExtensionId] = useState(null);

  useEffect(() => {
    const handleLoaded = (e) => {
      const allExtensions = e.detail;
      const views = [];
      allExtensions.forEach(ext => {
        if (ext.contributions && ext.contributions.views) {
          ext.contributions.views.forEach(view => {
            if (view.location === "sidebar") {
              views.push({ ...view, extensionId: ext.id });
            }
          });
        }
      });
      setExtensionViews(views);
    };

    window.addEventListener("dociere-extensions-loaded", handleLoaded);
    return () => window.removeEventListener("dociere-extensions-loaded", handleLoaded);
  }, []);

  const handleExtensionClick = (extId) => {
    const newId = activeExtensionId === extId ? null : extId;
    setActiveExtensionId(newId);
    window.dispatchEvent(new CustomEvent("dociere-toggle-extension", { 
      detail: { id: extId, visible: !!newId } 
    }));
  };

  console.log("user", user);
  console.log("isServerConnected", isServerConnected);
  console.log("projectDetails", projectDetails);

  const handleMathIconClick = (e) => {
    e.preventDefault();
    setIsMathModalOpen(true);
  };

  const handleShareIconClick = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
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

  const handleTableIconClick = (e) => {
    e.preventDefault();
    setIsTableModalOpen(true);
  };

  const handleImageIconClick = (e) => {
    e.preventDefault();
    setIsImageModalOpen(true);
  };

  const handleExtensionsIconClick = (e) => {
    e.preventDefault();
    setIsExtensionsModalOpen(true);
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
            {!projectDetails?.currentProject?.id && (
              <>
                {/* Create New Project */}
                <Link to="/template">
                  <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                    <span
                      className={`flex items-center justify-center cursor-pointer transition-colors rounded-md relative group font-poppins font-extralight text-xl p-0 m-0 -mb-1`}
                      title="Create New Project"
                      style={{
                        color:
                          settings.appearance.customThemes[
                            settings.appearance.theme
                          ].icon1,
                      }}
                    >
                      +
                    </span>
                  </div>
                </Link>
                {/* Open Existing Project */}
                <div
                  id="tour-openExistingProject-space"
                  onClick={toggleSectionSpace}
                >
                  <span
                    className="flex items-center justify-center text-[#585858] cursor-pointer relative group mb-1"
                    title="Open Existing Project"
                  >
                    <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                      <FileOpen
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
              </>
            )}
            {projectDetails?.currentProject?.id && (
              <>
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
                <div
                  id="tour-section-space"
                  onClick={toggleSectionSpace}
                  className={`border-r-[1.5px] ml-1 pr-1 ${
                    isSectionSpaceOpen ? "border-black" : "border-transparent"
                  }`}
                >
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
              </>
            )}

            {projectDetails?.currentProject?.id && (
              <>
                {/* Insert Table */}
                <div onClick={handleTableIconClick}>
                  <span
                    className="flex items-center justify-center text-[#585858] cursor-pointer relative group"
                    title="Insert Table"
                  >
                    <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                      <TableIcon
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

                {/* Insert Image */}
                <div onClick={handleImageIconClick}>
                  <span
                    className="flex items-center justify-center text-[#585858] cursor-pointer relative group"
                    title="Insert Image"
                  >
                    <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                      <ImageIcon
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
              </>
            )}

            {/* Extensions */}
            <Link id="tour-extensions" onClick={handleExtensionsIconClick}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer relative group"
                title="Extensions Store"
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

            {/* Dynamic Extension Icons */}
            {extensionViews.map((view) => (
              <div 
                key={view.id} 
                onClick={() => handleExtensionClick(view.extensionId)}
                className={`border-r-[1.5px] ml-1 pr-1 ${
                  activeExtensionId === view.extensionId ? "border-black" : "border-transparent"
                }`}
              >
                <span
                  className="flex items-center justify-center text-[#585858] cursor-pointer relative group"
                  title={view.title}
                >
                  <div className="p-2 hover:bg-[#e9e9e9] rounded-md">
                    {/* For now use a generic box icon for dynamic ones or the provided icon if we had mapping */}
                    <FiBox 
                      size={16}
                      style={{
                        color: settings.appearance.customThemes[settings.appearance.theme].icon1,
                      }}
                    />
                  </div>
                </span>
              </div>
            ))}

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

            {projectDetails?.currentProject?.id && (
              <>
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
              </>
            )}
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

      {isImageModalOpen && (
        <ImageInsertModal isOpen={true} onClose={() => setIsImageModalOpen(false)} />
      )}

      {isTableModalOpen && (
        <TableDesignerModal isOpen={true} onClose={() => setIsTableModalOpen(false)} />
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

      {/* Extensions Modal */}
      {isExtensionsModalOpen && (
        <Extensions onClose={() => setIsExtensionsModalOpen(false)} />
      )}


      {/* Auth Modal for Share */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80]">
          <div className="bg-white rounded-xl shadow-xl p-8 w-[380px] max-w-full text-center font-inter">
            <div className="text-5xl mb-3">👤</div>
            <h3 className="font-semibold text-lg text-[#343434] mb-1">Not Signed In</h3>
            <p className="text-sm text-[#7D7D7D] mb-5">Sign in to share and collaborate on projects</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2 bg-[#AB2D2D] text-white rounded-md text-sm hover:bg-[#8a2424] transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="px-5 py-2 border border-[#CFCFCF] text-[#343434] rounded-md text-sm hover:bg-[#F9F9F9] transition-colors"
              >
                Create Account
              </button>
            </div>
            <button
              onClick={() => setShowAuthModal(false)}
              className="mt-4 text-xs text-[#7D7D7D] hover:text-[#343434] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DynamicSideBar;
