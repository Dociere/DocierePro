import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import FileOpen from "../assets/icons/fileOpen.svg?react";
import SearchBar from "../components/searchBar";
import TemplateCards from "../components/templateCards";
import {
  loadProjects,
  deleteProjectFromDisk,
  uploadZipProject,
} from "../api/projectHandling.jsx";
import { useSettings } from "../context/useSettings";
import ConfirmModal from "../components/confirmModal.jsx";
import LinearLoading from "../components/loading/linearLoading";
import { TbX } from "react-icons/tb";

const StartingPage = () => {
  const [projectData, setProjectData] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const fileRef = useRef(null);
  const modalRefs = useRef({});
  const [projectModal, setProjectModal] = useState(false);
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRefreshKey(1);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const fetchData = async () => {
    const { Projects } = await loadProjects();
    setProjectData(Projects);
    console.log("Starting Page", Projects);
  };
  const handleDeleteClick = (project) => {
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (projectToDelete) {
      try {
        // 1. Physical deletion from local disk
        const result = await deleteProjectFromDisk(projectToDelete.id);

        if (result.success) {
          // 2. Update local React state to remove the card
          setProjectData((prev) =>
            prev.filter((p) => p.id !== projectToDelete.id),
          );
          console.log(`UI updated: Removed ${projectToDelete.id}`);
        }
      } catch (error) {
        console.error("Deletion process failed:", error);
        // Optional: Add a toast notification here to inform the user
      } finally {
        setShowDeleteConfirm(false);
        setProjectToDelete(null);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith(".zip")) {
      setIsUploading(true);
      try {
        const projectId = await uploadZipProject(file);
        if (projectId) {
          navigate(`/canvas?project=${projectId}`);
        }
      } catch (err) {
        console.error("Failed to upload zip project:", err);
        setAlertModal({
          isOpen: true,
          title: "Upload Failed",
          message: "Failed to upload project. Please try again.",
        });
      } finally {
        setIsUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    } else if (file.name.endsWith(".tex")) {
      setAlertModal({
        isOpen: true,
        title: "Unsupported Format",
        message:
          "Direct .tex upload is not yet supported. Please zip your project folder and upload the .zip file.",
      });
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      {isUploading && (
        <LinearLoading message="Extracting and parsing your files..." />
      )}
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
              <input
                type="file"
                accept=".tex, .zip"
                ref={fileRef}
                onChange={handleFileUpload}
                hidden
              />

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
            {(projectData || []).slice(0, 5)?.map((project) => (
              <Link key={project.id} to={`/canvas?project=${project.id}`}>
                <TemplateCards
                  title={project.title}
                  onDeleteClick={() => handleDeleteClick(project)}
                />
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
                className="absolute top-4 right-3 text-gray-500 hover:text-gray-800"
              >
                <TbX size={20} />
              </button>
              <h2 className="text-2xl font-inter font-semibold mb-2">
                Recent Projects
              </h2>
              <SearchBar data={projectData} />

              {/* Modal content with scroll */}
              <div className="overflow-auto h-[65vh] mt-4">
                <div className="flex flex-row mt-10 gap-8 flex-wrap">
                  {(projectData || [])?.map((project) => (
                    <Link key={project.id} to={`/canvas?project=${project.id}`}>
                      <TemplateCards
                        key={project.id}
                        title={project.title}
                        onDeleteClick={() => handleDeleteClick(project)}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          title="Delete Project"
          message={`Are you sure you want to delete "${projectToDelete?.title}"? This will permanently remove the project folder (${projectToDelete?.id}) and all its contents.`}
          confirmText="Delete Project"
          cancelText="Cancel"
          isDanger={true}
        />
        <ConfirmModal
          isOpen={alertModal.isOpen}
          title={alertModal.title}
          message={alertModal.message}
          confirmText="OK"
          cancelText=""
          onConfirm={() => setAlertModal({ ...alertModal, isOpen: false })}
          onCancel={() => setAlertModal({ ...alertModal, isOpen: false })}
        />
      </div>
    </>
  );
};

export default StartingPage;
