import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import FileOpen from "../assets/icons/fileOpen.svg?react";
import SearchBar from "../components/searchBar";
import TemplateCards from "../components/templateCards";
import { loadProjects } from "../api/projectHandling.jsx";
import { useSettings } from "../context/useSettings";

const StartingPage = () => {
  const [projectData, setProjectData] = useState([]);
  const fileRef = useRef(null);
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { Projects } = await loadProjects();
    setProjectData(Projects);
    console.log("Starting Page", Projects);
  };

  return (
    <div className={`h-screen overflow-y-auto scrollbar-hide flex flex-col ml-36 mr-20 pb-10 mt-10 transition-colors duration-300 ${isDark ? 'text-[#e5e5e5]' : 'text-black'
      }`}>
      <div className="flex flex-row mt-20">
        <div>
          <div className={`text-5xl font-playfair font-bold leading-[32px] transition-colors ${isDark ? 'text-white' : 'text-black'
            }`}>
            Docière Pro
          </div>
          <div className={`mt-4 text-3xl font-inter font-extralight tracking-wide transition-colors ${isDark ? 'text-[#a0a0a0]' : 'text-[#7D7D7D]'
            }`}>
            Latex Redefined
          </div>
        </div>
        <div className="ml-72">
          <div className={`text-base font-inter font-medium leading-[20px] transition-colors ${isDark ? 'text-[#e5e5e5]' : 'text-[#3B3B3B]'
            }`}>
            Get started
          </div>

          <div className="mt-5 gap-5 flex flex-col w-fit">
            <Link to="/template">
              <div className={`relative text-base font-inter font-normal text-nowrap pl-14 pt-[1vh] pb-[0.7vh] pr-10 border-[1px] transition-colors ${isDark ? 'text-[#ff6b6b] border-[#ff6b6b] hover:bg-[#ff6b6b]/10' : 'text-[#AB2D2D] border-[#AB2D2D]'
                }`}>
                <span className="absolute left-5 font-playfair top-0 text-2xl">
                  +
                </span>
                Create New Project
              </div>
            </Link>
            <input type="file" accept=".tex" ref={fileRef} hidden />

            <div
              onClick={() => fileRef.current.click()}
              className={`relative cursor-pointer text-base font-inter font-normal text-nowrap border-[1px] pl-14 pt-[1vh] pb-[0.7vh] pr-0 transition-colors ${isDark ? 'text-[#4ea8de] border-[#4ea8de] hover:bg-[#4ea8de]/10' : 'text-[#256081] border-[#256081]'
                }`}
            >
              <span className="absolute left-5 top-[1.7vh]">
                <FileOpen style={{ fill: isDark ? "#4ea8de" : "#256081" }} className="w-4 h-4" />
              </span>
              Open Existing Project
            </div>
          </div>
        </div>
      </div>

      <div className="mt-20">
        <div className={`text-xl font-inter font-medium leading-[20px] transition-colors ${isDark ? 'text-[#e5e5e5]' : 'text-[#555555]'
          }`}>
          Recent Projects
        </div>
        <SearchBar />
        <div className="flex flex-row mt-10 gap-8 flex-wrap">
          {(projectData || []).slice(0, 5).map((project) => (
            <TemplateCards key={project.id} title={project.title} projectId={project.id} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StartingPage;
