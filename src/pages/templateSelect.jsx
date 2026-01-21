import React, { useState } from "react";
import { Link } from "react-router-dom";
import GoBack from "../assets/icons/goBack.svg?react";
import TemplateCards from "../components/templateCards";

import { useSettings } from "../context/useSettings";

function TemplateSelect() {
  const [selected, setSelected] = useState("");
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";

  const templates = [
    "Blank Document",
    "IEEE Format",
    "MLA Format",
    "APA Format",
    "Chicago Format",
    "Harvard Format",
    "ACM Format",
    "XYZ Format",
    "ABC Format",
    "LMNO Format",
  ];

  return (
    <div className={`mt-20 transition-colors duration-300 ${isDark ? 'text-[#e5e5e5]' : 'text-black'}`}>
      <Link to="/">
        <div className={`font-inter ml-24 mt-10 text-sm flex items-center transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-white' : 'text-black hover:opacity-70'}`}>
          <GoBack style={{ fill: isDark ? "#a0a0a0" : "#0a0a0a" }} className="w-5 h-5" />
          <p className="ml-2">Go Back</p>
        </div>
      </Link>
      <div className="flex justify-center">
        <div className="mt-0 ml-28 w-[72vw] mb-10">
          <p className={`font-playfair text-5xl font-bold transition-colors ${isDark ? 'text-white' : 'text-black'}`}>Templates</p>
          <div className=" flex flex-row mt-2 justify-between w-full">
            <div>
              <p className={`font-inter font-medium transition-colors ${isDark ? 'text-[#a0a0a0]' : 'text-[#7D7D7D]'}`}>
                Select the desired template to work upon
              </p>
            </div>
            <div>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className={`px-2 py-1 text-sm border-2 transition-colors ${isDark
                  ? 'bg-[#1a1a1a] text-[#e5e5e5] border-[#404040]'
                  : 'bg-[#F9F9F9] text-[#4E4E4E] border-[#CFCFCF]'}`}
              >
                <option value="">Template Types</option>
                <option value="tech">Technical</option>
                <option value="non-tech">Non-Technical</option>
              </select>
            </div>
          </div>
          <div className="flex flex-row flex-wrap mt-10 gap-20">
            {templates.map((templateTitle) => (
              <Link key={templateTitle} to={`/detailPage/${templateTitle}`}>
                <TemplateCards title={templateTitle} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateSelect;
