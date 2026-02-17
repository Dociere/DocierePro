import React, { useState } from "react";
import { Link } from "react-router-dom";
import GoBack from "../assets/icons/goBack.svg?react";
import TemplateCards from "../components/templateCards";

function TemplateSelect() {
  const [selected, setSelected] = useState("");

  // const templates = [
  //   "Blank Document",
  //   "IEEE Format",
  //   "MLA Format",
  //   "APA Format",
  //   "Chicago Format",
  //   "Harvard Format",
  //   "ACM Format",
  //   "XYZ Format",
  //   "ABC Format",
  //   "LMNO Format",
  // ];

  const templates = {
    "Blank Document": "blank",
    "AI4X Conference": "ai4x",
    "MLA Format": "mla",
    "Springer Nature Journal": "springer_nature",
    "IEEE Transactions on Magnetics": "ieee_transmag",
    "IEEE Transactions on Medical Imaging": "ieee_tmi",
    "IEEE Journal": "ieee_journal",
    "IEEE Transactions on Nuclear Science": "ieee_tns",
    "IEEE Journal Letters": "ieee_journal_letters",
    "MDPI Journal": "mdpi",
    "ACM Manuscript": "acm_manuscript",
    "Cell Press Journal": "cell_press",
    "ACS Journal": "acs",
    "Frontiers Journal": "frontiers",
    "Elsevier Article": "elsarticle",
    "American Journal of Physics": "ajp",
    "AIP Journal": "aip",
    "Science Journal": "science",
    "Royal Society of Chemistry Journal": "rsc",
    "ASM Journal": "asm_journal",
    "ASME Journal": "asme",
    "AMS Transactions": "ams_tran",
    "IOS Press Book Article": "ios_book_article",
    "SPIE Journal": "spie_journal",
  };

  return (
    <div className="flex flex-row mt-20">
      <Link to="/" className="font-inter ml-24 mt-3 text-sm flex ">
        <GoBack style={{ fill: "#0a0a0a" }} className="w-5 h-5" />
        <p className="ml-2">Go Back</p>
      </Link>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mt-0 ml-20 w-[72vw] mb-10">
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
            {Object.entries(templates).map(([title, value]) => (
              <Link
                key={value}
                id={value === "blank" ? "tour-blank-template" : undefined}
                to={`/detailPage/${value}`}
              >
                <TemplateCards title={title} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateSelect;
