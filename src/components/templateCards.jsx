import React from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/useSettings";

const TemplateCards = ({ title, projectId }) => {
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";
  const navigate = useNavigate();

  const handleProjectClick = () => {
    if (projectId) {
      navigate(`/canvas?project=${projectId}`);
    } else {
      // If it's a template (no projectId), navigate to template page
      navigate("/template");
    }
  };

  return (
    <>
      <div className="flex flex-col cursor-pointer" onClick={handleProjectClick}>
        <div className={`w-44 h-56 border-2 flex-shrink-0 transition-colors ${isDark ? 'bg-[#1a1a1a] border-[#404040] hover:bg-[#252525]' : 'bg-[#F9F9F9] border-[#c6c6c6] hover:bg-gray-50'
          }`}></div>
        <p className={`mt-2 font-inter text-center font-light w-44 break-words truncate transition-colors ${isDark ? 'text-[#e5e5e5]' : 'text-black'
          }`}>
          {title}
        </p>
      </div>
    </>
  );
};

export default TemplateCards;
