import React, { useState } from "react";
import { Link } from "react-router-dom";
import TemplateCards from "../components/templateCards";

function TemplateSelect() {
  const [selected, setSelected] = useState("");

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
    <>
      <div className="flex justify-center">
        <div className="mt-6 ml-28 w-[72vw] mb-10">
          <p className="font-playfair text-5xl font-bold">Templates</p>
          <div className=" flex flex-row mt-2 justify-between w-full">
            <div>
              <p className="text-[#7D7D7D] font-inter font-medium">
                Select the desired template to work upon
              </p>
            </div>
            <div>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="bg-[#F9F9F9] px-2 py-1 text-[#4E4E4E] text-sm border-[#CFCFCF] border-2"
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
            {/* <TemplateCards title="IEEE Format" />
          <TemplateCards title="MLA Format" />
          <TemplateCards title="APA Format" />
          <TemplateCards title="XYZ Format" />
          <TemplateCards title="ABC Format" /> */}
          </div>
        </div>
      </div>
    </>
  );
}

export default TemplateSelect;
