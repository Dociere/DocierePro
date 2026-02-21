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
  const modalRefs = useRef({});
  const [projectModal, setProjectModal] = useState(false);
  const { settings } = useSettings();

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
      <div className="flex flex-row mt-14">
        <div>
          <div
            className="text-5xl font-playfair font-bold leading-[32px]"
            style={{
              color:
                settings.appearance.customThemes[settings.appearance.theme]
                  .text1,
            }}
          >
            Docière Pro
          </div>
          <div
            className="mt-4 text-[#7D7D7D] text-3xl font-inter font-extralight tracking-wide"
            style={{
              color:
                settings.appearance.customThemes[settings.appearance.theme]
                  .text3,
            }}
          >
            LaTeX Redefined
          </div>
        </div>
        <div className="ml-auto mr-44">
          <div
            className="text-base font-inter font-medium leading-[20px]"
            style={{
              color:
                settings.appearance.customThemes[settings.appearance.theme]
                  .text2,
            }}
          >
            Get started
          </div>

          <div className="mt-5 gap-5 flex flex-col w-fit">
            <Link id="tour-create-project" to="/template">
              <div className="relative text-[#AB2D2D] text-base font-inter font-normal text-nowrap border-[#AB2D2D] pl-14 pt-[1vh] pb-[0.7vh] pr-10 border-[1px]">
                <span className="absolute left-5 font-playfair top-0 text-2xl">
                  +
                </span>
                Create New Project
              </div>
            </Link>
            <input type="file" accept="*.tex, *.zip" ref={fileRef} hidden />

            <div
              onClick={() => fileRef.current.click()}
              className="relative cursor-pointer text-[#256081] text-base font-inter font-normal text-nowrap border-[#256081] pl-14 pt-[1vh] pb-[0.7vh] pr-0 border-[1px]"
            >
              <span className="absolute left-5 top-[1.7vh]">
                <FileOpen style={{ fill: "#256081" }} className="w-4 h-4" />
              </span>
              Open Existing Project
            </div>
            <p className="-mt-4 text-center text-gray-500 text-[12px]">
              files supported (*.zip, *.tex)
            </p>
          </div>
        </div>
      </div>

      <div className="mt-20">
        <div className="flex flex-row w-[24vw]">
          <div
            className="text-xl mb-3 font-inter font-medium leading-[20px]"
            style={{
              color:
                settings.appearance.customThemes[settings.appearance.theme]
                  .text2,
            }}
          >
            Recent Projects
          </div>
          <button
            className="ml-auto mr-1 pb-1"
            onClick={() => {
              setProjectModal(true);
            }}
          >
            <p className="text-sm hover:underline">View All</p>
          </button>
        </div>
        <SearchBar data={projectData} />
        <div className="flex flex-row mt-10 gap-8 flex-wrap">
          {(projectData || []).slice(0, 5).map((project) => (
            <Link to={`/canvas?project=${project.id}`}>
              <TemplateCards title={project.title} />
            </Link>
          ))}
        </div>
      </div>

      {projectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg min-w-lg max-w-[79vw] w-full p-4 relative h-[85vh]">
            {/* Close button */}
            <button
              onClick={() => setProjectModal(false)}
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>

            {/* Modal content with scroll */}
            <div className="overflow-auto h-[80vh] mr-5">
              <h2 className="text-2xl font-inter font-semibold mb-2">
                Recent Projects
              </h2>
              <SearchBar data={projectData} />
              <div className="flex flex-row mt-10 gap-8 flex-wrap">
                {(projectData || []).map((project) => (
                  <Link key={project.id} to={`/canvas?project=${project.id}`}>
                    <TemplateCards title={project.title} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartingPage;
