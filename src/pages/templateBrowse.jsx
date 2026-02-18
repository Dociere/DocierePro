import React from "react";
import { Link } from "react-router-dom";
import GoBack from "../assets/icons/goBack.svg?react";
import TemplateCards from "../components/templateCards";
import { useSettings } from "../context/useSettings";

const serverTemplates = {
  "Springer Nature Journal": "springer_nature",
  "MDPI Journal": "mdpi",
  "Beamer Presentation": "beamer",
  "AIP Journal": "aip",
  "Frontiers Journal": "frontiers",
};

const TemplateBrowse = () => {
  const { settings } = useSettings();
  const theme = settings.appearance.customThemes[settings.appearance.theme];

  return (
    <div className="h-screen overflow-y-auto flex flex-col ml-36 mr-20 pb-10 mt-10">
      {/* Back link */}
      <div className="flex flex-row mt-20">
        <Link
          to="/template"
          className="font-inter text-sm flex items-center gap-2 hover:opacity-70 transition-opacity"
          style={{ color: theme.text2 }}
        >
          <GoBack style={{ fill: theme.text2 }} className="w-4 h-4" />
          Back to Templates
        </Link>
      </div>

      {/* Heading */}
      <div className="mt-12">
        <div className="text-5xl font-playfair font-bold leading-[32px]" style={{ color: theme.text1 }}>
          More Templates
        </div>
        <div className="mt-4 font-inter font-extralight tracking-wide" style={{ color: theme.text3 }}>
          Official templates from Docière Server
        </div>
      </div>

      {/* Official Templates */}
      <div className="mt-14">
        <div className="text-base font-inter font-medium mb-6" style={{ color: theme.text2 }}>
          Official Templates
        </div>
        <div className="flex flex-row flex-wrap gap-8">
          {Object.entries(serverTemplates).map(([title, key]) => (
            <Link key={key} to={`/template/preview/${key}`} className="transform hover:scale-105 transition-transform duration-200">
              <TemplateCards title={title} />
            </Link>
          ))}
        </div>
      </div>

      {/* Third Party */}
      <div className="mt-16">
        <div className="text-base font-inter font-medium mb-6" style={{ color: theme.text2 }}>
          Third Party &amp; Community
        </div>
        <div
          className="py-10 px-8 border border-dashed rounded text-center"
          style={{ borderColor: theme.text3 + "60" }}
        >
          <p className="font-inter text-sm" style={{ color: theme.text3 }}>Coming soon — community templates will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default TemplateBrowse;
