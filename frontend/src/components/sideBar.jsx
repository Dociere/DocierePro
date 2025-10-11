import React, { useState, useContext } from "react";
import { Link } from "react-router-dom";
import EasyMathInput from "./easyMathInput";
import CitationManager from "./citationManager";
import SectionIcon from "../assets/icons/sectionIcon.svg?react";
import CitationIcon from "../assets/icons/citation-manager.svg?react";
import ShareIcon from "../assets/icons/shareIcon.svg?react";
import DraftIcon from "../assets/icons/draftIcon.svg?react";
import MathIcon from "../assets/icons/mathIcon.svg?react";
import ExtensionIcon from "../assets/icons/extensionIcon.svg?react";
import CompileIcon from "../assets/icons/compileIcon.svg?react";
import SectionSpace from "./sectionSpace";
import { projectContext } from "../context/useProject";
import { compileDocument } from "../api/projectHandling";

const DynamicSideBar = () => {
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [isSectionSpaceOpen, setIsSectionSpaceOpen] = useState(false);
  const { projectDetails } = useContext(projectContext);
  const {
    currentProject,
    activeFile,
    isCompiling,
    compilationStatus,
    compilationMessage,
    pdfUrl,
    latexContent,
  } = projectDetails;

  const handleMathIconClick = (e) => {
    e.preventDefault();
    setIsMathModalOpen(true);
  };

  const handleCompile = () => {
    compileDocument(
      currentProject,
      activeFile,
      isCompiling,
      compilationStatus,
      compilationMessage,
      pdfUrl,
      latexContent
    );
  };

  const handleCitationIconClick = (e) => {
    e.preventDefault();
    setIsCitationModalOpen(true);
  };

  return (
    <>
      <div className="bg-[#F9F9F9] h-[calc(100vh-4rem)] w-14 fixed top-11 left-0 z-40 border-[#CFCFCF] border-r-[1px]">
        <div className="flex flex-col items-center pt-4 space-y-5">
          {/* Section Space */}
          <div onClick={() => setIsSectionSpaceOpen(!isSectionSpaceOpen)}>
            <span
              className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
              title="Section Space"
            >
              <SectionIcon style={{ fill: "#585858" }} className="w-5 h-5" />

              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Section Space
              </span>
            </span>
          </div>

          {/* Citation Manager */}
          <Link to="/canvas" onClick={handleCitationIconClick}>
            <span
              className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
              title="Citation Manager"
            >
              <CitationIcon style={{ fill: "#585858" }} className="w-5 h-5" />
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Citation Manager
              </span>
            </span>
          </Link>
          {/* Share / Collaborate */}
          <Link to="/canvas">
            <span
              className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
              title="Share"
            >
              <ShareIcon style={{ fill: "#585858" }} className="w-5 h-5" />

              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Share
              </span>
            </span>
          </Link>
          {/* Easy Math Input */}
          <Link to="/canvas" onClick={handleMathIconClick}>
            <span
              className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
              title="Easy Math Input"
            >
              <MathIcon style={{ fill: "#585858" }} className="w-5 h-5" />

              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Easy Math Input
              </span>
            </span>
          </Link>
          {/* Draft Versioning */}
          <Link to="/canvas">
            <span
              className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
              title="Draft Versioning"
            >
              <DraftIcon style={{ fill: "#585858" }} className="w-5 h-5" />

              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Draft Versioning
              </span>
            </span>
          </Link>
          {/* Extensions */}
          <Link to="/canvas">
            <span
              className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
              title="Extensions"
            >
              <ExtensionIcon style={{ fill: "#585858" }} className="w-5 h-5" />

              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Extensions
              </span>
            </span>
          </Link>
          {/* Compile */}
          <div onClick={handleCompile}>
            <span
              className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
              title="Compile"
            >
              <CompileIcon style={{ fill: "#585858" }} className="w-5 h-5" />

              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Compile
              </span>
            </span>
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

      {isSectionSpaceOpen && <SectionSpace />}
    </>
  );
};

export default DynamicSideBar;
