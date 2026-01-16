import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import FileOpen from "../assets/icons/fileOpen.svg?react";
import SearchBar from "../components/searchBar";
import TemplateCards from "../components/templateCards";
import { loadProjects } from "../api/projectHandling.jsx";

const StartingPage = () => {
  const [projectData, setProjectData] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { Projects } = await loadProjects();
    setProjectData(Projects);
    console.log("Starting Page", Projects);
  };

  return (
    <div className="h-screen overflow-y-auto scrollbar-hide flex flex-col ml-36 mr-20 pb-10 mt-10">
      <div className="flex flex-row mt-20">
        <div>
          <div className="text-black text-5xl font-playfair font-bold leading-[32px]">
            Docière Pro
          </div>
          <div className="mt-4 text-[#7D7D7D] text-3xl font-inter font-extralight tracking-wide">
            Latex Redefined
          </div>
        </div>
        <div className="ml-72">
          <div className="text-[#3B3B3B] text-base font-inter font-medium leading-[20px]">
            Get started
          </div>

          <div className="mt-5 gap-5 flex flex-col w-fit">
            <Link to="/template">
              <div className="relative text-[#AB2D2D] text-base font-inter font-normal text-nowrap border-[#AB2D2D] pl-14 pt-[1vh] pb-[0.7vh] pr-10 border-[1px]">
                <span className="absolute left-5 font-playfair top-0 text-2xl">
                  +
                </span>
                Create New Project
              </div>
            </Link>
            <input type="file" accept=".tex" ref={fileRef} hidden />

            <div
              onClick={() => fileRef.current.click()}
              className="relative cursor-pointer text-[#256081] text-base font-inter font-normal text-nowrap border-[#256081] pl-14 pt-[1vh] pb-[0.7vh] pr-0 border-[1px]"
            >
              <span className="absolute left-5 top-[1.7vh]">
                <FileOpen style={{ fill: "#256081" }} className="w-4 h-4" />
              </span>
              Open Existing Project
            </div>
          </div>
        </div>
      </div>

      <div className="mt-20">
        <div className="text-[#555555] text-xl font-inter font-medium leading-[20px]">
          Recent Projects
        </div>
        <SearchBar />
        <div className="flex flex-row mt-10 gap-8 flex-wrap">
          {(projectData || []).slice(0, 5).map((project) => (
            <TemplateCards title={project.title} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StartingPage;
