import React, { useState, useContext } from "react";
import { Link } from "react-router-dom";
import EasyMathInput from "./easyMathInput";
import CitationManager from "./citationManager";
import ShareProject from "./shareProject";
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
import SectionSpace from "./sectionSpace";
import { projectContext } from "../context/useProject";
import { compileDocument } from "../api/projectHandling";
import { useAuth } from "../context/useAuth";
import axios from "axios";

const DynamicSideBar = () => {
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isProfileActive, setIsProfileActive] = useState(false);
  const [isSectionSpaceOpen, setIsSectionSpaceOpen] = useState(false);
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
  const { user } = useAuth();

  console.log(user);
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

  const handleCompile = async () => {
    const response = await compileDocument(
      currentProject,
      activeFile,
      isCompiling,
      compilationStatus,
      compilationMessage,
      pdfUrl,
      latexContent
    );

    // console.log("handleCompile response", response.pdfUrl);

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
      console.log("Successfully Logged Out");
      window.location.reload();
    } catch (error) {
      console.log("Logout Error:", error);
    }
  };

  return (
    <>
      <div className="bg-[#F9F9F9] h-[calc(100vh-4rem)] w-12 fixed top-11 left-0 z-40 border-[#CFCFCF] border-r-[1px]">
        <div className="flex flex-col justify-between h-full">
          <div className="flex flex-col items-center pt-4 space-y-3">
            {/* Current Project file */}
            <Link to="/canvas">
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Current Project file"
              >
                <DraftIcon style={{ fill: "#585858" }} className="w-4 h-4" />

                {/* <span className="absolute left-full top-0 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Current Project file
              </span> */}
              </span>
            </Link>
            {/* Section Space */}
            <div onClick={() => setIsSectionSpaceOpen(!isSectionSpaceOpen)}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer relative group"
                title="Section Space"
              >
                <div className="p-3 hover:bg-gray-200 rounded-md">
                  <SectionIcon
                    style={{ fill: "#585858" }}
                    className="w-4 h-4"
                  />
                </div>

                {/* <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Section Space
              </span> */}
              </span>
            </div>

            {/* Citation Manager */}
            <div className="relative group">
              <Link onClick={handleCitationIconClick}>
                <div
                  className="flex items-center justify-center text-[#585858] cursor-pointer p-2"
                  title="Citation Manager"
                >
                  <CitationIcon
                    style={{ fill: "#585858" }}
                    className="w-4 h-4"
                  />
                </div>
              </Link>

              {/* <p
              className="absolute left-full top-2 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded 
                opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                whitespace-nowrap z-50"
            >
              Citation Manager
            </p> */}
            </div>

            {/* Share / Collaborate */}
            <div onClick={handleShareIconClick}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Share"
              >
                <ShareIcon style={{ fill: "#585858" }} className="w-4 h-4" />

                {/* <span className="absolute left-full top-1 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Share
              </span> */}
              </span>
            </div>

            {/* Easy Math Input */}
            <Link onClick={handleMathIconClick}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Easy Math Input"
              >
                <MathIcon style={{ fill: "#585858" }} className="w-4 h-4" />

                {/* <span className="absolute left-full top-0 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Easy Math Input
              </span> */}
              </span>
            </Link>

            {/* Extensions */}
            <Link to="/canvas">
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Extensions"
              >
                <ExtensionIcon
                  style={{ fill: "#585858" }}
                  className="w-4 h-4"
                />

                {/* <span className="absolute left-full top-0 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Extensions
              </span> */}
              </span>
            </Link>

            {/* Compile */}
            <div onClick={handleCompile}>
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Compile"
              >
                {/* <CompileIcon style={{ fill: "#585858" }} className="w-5 h-5" /> */}
                {projectDetails.compilationStatus === "error" ? (
                  <div className="text-xl text-[#ff0000]">►</div>
                ) : projectDetails.compilationStatus === "success" ? (
                  <div className="text-xl text-[#16be00]">►</div>
                ) : (
                  <div className="text-xl text-[#929292]">►</div>
                )}

                {/* <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Compile
              </span> */}
              </span>
            </div>
          </div>
          <div className="flex flex-col mb-2">
            {/* Settings */}
            <Link to="/canvas">
              <span
                className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
                title="Settings"
              >
                <SettingsIcon style={{ fill: "#585858" }} className="w-5 h-5" />
              </span>
            </Link>
            {/* User Profile */}
            <Link onClick={handleProfileIconClick}>
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
                  <UserIcon style={{ fill: "#585858" }} className="w-5 h-5" />
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

      {isSectionSpaceOpen && <SectionSpace />}
    </>
  );
};

export default DynamicSideBar;
