import { createContext, useState } from "react";

export const projectContext = createContext(null);

export const ProjectProvider = (props) => {
  const [projectDetails, setProjectDetails] = useState({
    currentProject: null,
    project: [],
    activeFile: "main.tex",
    isCompiling: false,
    compilationStatus: "",
    compilationMessage: "",
    pdfUrl: "",
    latexContent: "",
  });

  const updateProjectDetails = (newDetails) => {
    setProjectDetails((prevDetails) => ({
      ...prevDetails,
      ...newDetails,
    }));
  };

  return (
    <projectContext.Provider value={{ projectDetails, updateProjectDetails }}>
      {props.children}
    </projectContext.Provider>
  );
};
