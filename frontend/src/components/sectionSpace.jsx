import React from "react";

const SectionSpace = ({
  projects,
  currentProject,
  activeFile,
  loadProject,
  setActiveFile,
}) => {
  return (
    <div className="overleaf-sidebar">
      <div className="sidebar-section">
        <div className="sidebar-title">Projects</div>
        {projects.map((project) => (
          <div
            key={project.id}
            className={`file-item ${
              currentProject && currentProject.id === project.id ? "active" : ""
            }`}
            onClick={() => loadProject(project.id)}
          >
            <span className="file-icon">📁</span>
            <span>{project.name}</span>
          </div>
        ))}
      </div>

      {currentProject && (
        <div className="sidebar-section">
          <div className="sidebar-title">Files</div>
          {Object.keys(currentProject.files).map((fileName) => (
            <div
              key={fileName}
              className={`file-item ${fileName === activeFile ? "active" : ""}`}
              onClick={() => setActiveFile(fileName)}
            >
              <span className="file-icon">📄</span>
              <span>{fileName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SectionSpace;
