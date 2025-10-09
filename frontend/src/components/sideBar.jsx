import React, { useState } from "react";
import { Link } from "react-router-dom";
import { TbMathIntegralX } from "react-icons/tb";
import EasyMathInput from "./easyMathInput";
import CitationManager from "./citationManager";
import CitationIcon from "../assets/icons/citation-manager.svg";

const DynamicSideBar = () => {
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);

  const handleMathIconClick = (e) => {
    e.preventDefault();
    setIsMathModalOpen(true);
  };

  const handleCitationIconClick = (e) => {
    e.preventDefault();
    setIsCitationModalOpen(true);
  };

  return (
    <>
      <div className="bg-[#F9F9F9] h-[calc(100vh-4rem)] w-14 fixed top-11 left-0 z-40 border-[#CFCFCF] border-r-[1px]">
        <div className="flex flex-col items-center pt-4 space-y-6">
          {/* Easy Math Input */}
          <Link to="/canvas" onClick={handleMathIconClick}>
            <span
              className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
              title="Easy Math Input"
            >
              <TbMathIntegralX size="1.8em" color="#000000" />
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Easy Math Input
              </span>
            </span>
          </Link>

          {/* Citation Manager */}
          <Link to="/canvas" onClick={handleCitationIconClick}>
            <span
              className="flex items-center justify-center text-[#585858] cursor-pointer p-2 relative group"
              title="Citation Manager"
            >
              <img src={CitationIcon} alt="Citation" className="w-7 h-7" />
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Citation Manager
              </span>
            </span>
          </Link>
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
    </>
  );
};

export default DynamicSideBar;
