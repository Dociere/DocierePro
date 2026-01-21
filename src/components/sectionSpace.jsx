// import React from "react";

// const SectionSpace = ({
//   projects,
//   currentProject,
//   activeFile,
//   loadProject,
//   setActiveFile,
// }) => {
//   return (
//     <div>
//       <div>
//         <div className="font-inter text-black">Projects</div>
//         {/* {projects.map((project) => (
//           <div
//             key={project.id}
//             className={`file-item ${
//               currentProject && currentProject.id === project.id ? "active" : ""
//             }`}
//             onClick={() => loadProject(project.id)}
//           >
//             <span className="file-icon">📁</span>
//             <span>{project.name}</span>
//           </div>
//         ))} */}
//       </div>

//       {/* {currentProject && (
//         <div className="sidebar-section">
//           <div className="sidebar-title">Files</div>
//           {Object.keys(currentProject.files).map((fileName) => (
//             <div
//               key={fileName}
//               className={`file-item ${fileName === activeFile ? "active" : ""}`}
//               onClick={() => setActiveFile(fileName)}
//             >
//               <span className="file-icon">📄</span>
//               <span>{fileName}</span>
//             </div>
//           ))}
//         </div>
//       )} */}
//     </div>
//   );
// };

// export default SectionSpace;

import React from "react";
import { useSettings } from "../context/useSettings";

const SectionSpace = () => {
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";

  return (
    <div className={`ml-12 top-0 h-screen w-56 border-r-[1px] -mr-12 z-10 relative transition-colors duration-300 ${isDark ? "bg-[#1a1a1a] border-[#333] text-white" : "bg-[#F9F9F9] border-[#CFCFCF] text-black"
      }`}>
      <div className="p-4">
        <p className="font-semibold opacity-50 uppercase text-[10px] tracking-wider">
          Section Space
        </p>
      </div>
    </div>
  );
};

export default SectionSpace;
