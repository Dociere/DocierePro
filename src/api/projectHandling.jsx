/*Functions in this file:
- createProject()
- loadProjects()
- loadProject()
- saveProject()
- compileDocument():
*/

import axios from "axios";

const API_URL = "http://localhost:5000";

export const createProject = async (
  title,
  authorDetails,
  userIdea,
  isGenChecked,
  Owner,
  e
) => {
  e.preventDefault();
  if (!title) return;

  try {
    const payload = {
      title,
      authorDetails,
      generateBoilerplate: isGenChecked,
      userIdea: isGenChecked ? userIdea : null,
      Owner: Owner || null,
    };

    const response = await axios.post(
      `${API_URL}/api/projects/create`,
      payload
    );
    console.log(`Project Successfully Created - ${title}`);
    return response.data.project.id; // Return project ID for navigation
  } catch (error) {
    console.log("Failed to create project: " + error.message);
    throw error;
  }
};

export const loadProjects = async () => {
  try {
    let Loading = true;
    const response = await axios.get(`${API_URL}/api/projects`);
    const Projects = response.data;
    let CurrentProject = null;
    let ActiveFile = null;
    let Error = "";

    if (response.data.length > 0) {
      const projectData = await loadProject(response.data[0].id);
      CurrentProject = projectData.CurrentProject;
      ActiveFile = projectData.ActiveFile;
      Error = projectData.Error;
    }

    Loading = false;
    return { Projects, Loading, CurrentProject, ActiveFile, Error };
  } catch (error) {
    const Error = "Failed to load projects: " + error.message;
    return { Error, Loading: false };
  }
};

export const loadProject = async (projectId) => {
  try {
    const Loading = true;
    const response = await axios.get(`${API_URL}/api/projects/${projectId}`);
    const CurrentProject = response.data.project;
    const ActiveFile = response.data.project.activeFile || "main.tex";
    const Error = "";

    return { CurrentProject, ActiveFile, Error };
  } catch (error) {
    const Error = "Failed to load project: " + error.message;
    return { CurrentProject: null, ActiveFile: null, Error };
  } finally {
    const Loading = false;
  }
};

export const loadProjectFromServer = async (projectId, serverUrl) => {
  try {
    const response = await axios.get(`${serverUrl}/api/projects/${projectId}`, {
      withCredentials: true,
    });

    return {
      project: response.data,
      loading: false,
      error: null,
    };
  } catch (error) {
    console.error("Error loading project from server:", error);
    return {
      project: null,
      loading: false,
      error: error.response?.data?.error || "Failed to load project",
    };
  }
};

export const saveProject = async (
  currentProject,
  activeFile,
  compilationStatus,
  compilationMessage,
  isServerConnected,
  isAuthenticated
) => {
  if (!currentProject) return;
  console.log("From saveProject", currentProject);

  try {
    await axios.put(`${API_URL}/api/projects/${currentProject.id}`, {
      files: currentProject.files,
      owner: currentProject.owner,
      activeFile: activeFile,
    });

    if (isServerConnected && isAuthenticated) {
      try {
        await axios.put(
          `${import.meta.env.VITE_admin_server}/api/projects/${
            currentProject.id
          }`,
          {
            files: currentProject.files,
            owner: currentProject.owner,
            title: currentProject.title,
            activeFile: activeFile,
          }
        );
      } catch (error) {
        console.log("Failed to save project to DB: " + error.message);
      }
    }

    // compilationStatus = "success";
    // compilationMessage = "Project saved successfully";
    // setTimeout(() => {
    //   compilationStatus = "";
    //   compilationMessage = "";
    // }, 3000);
  } catch (error) {
    console.log("Failed to save project: " + error.message);
  }
};

export const compileDocument = async (
  currentProject,
  activeFile,
  isCompiling,
  compilationStatus,
  compilationMessage,
  pdfUrl,
  latexContent,
  isServerConnected,
  isAuthenticated
) => {
  if (!currentProject || !activeFile) return;

  isCompiling = true;
  compilationStatus = "compiling";
  compilationMessage = "Compiling document...";

  try {
    // Use the current LaTeX content for compilation
    const contentToCompile = latexContent;

    // Validate document before compilation
    if (
      !contentToCompile.includes("\\begin{document}") ||
      !contentToCompile.includes("\\end{document}")
    ) {
      throw new Error("Invalid LaTeX document structure");
    }

    // console.log(
    //   "Compiling LaTeX document:",
    //   contentToCompile.substring(0, 200) + "..."
    // );

    const response = await axios.post(`${API_URL}/api/compile`, {
      content: contentToCompile,
      projectId: currentProject.id,
    });

    if (response.data.success) {
      const pdfBlob = new Blob(
        [Uint8Array.from(atob(response.data.pdf), (c) => c.charCodeAt(0))],
        { type: "application/pdf" }
      );
      const newPdfUrl = URL.createObjectURL(pdfBlob);

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      pdfUrl = newPdfUrl;
      compilationStatus = "success";
      compilationMessage = "PDF compiled successfully!";

      // console.log(
      //   "\nStatus:",
      //   compilationStatus,
      //   "\nMessage:",
      //   compilationMessage
      // );
      // window.open(pdfUrl, "_blank");

      // Auto-save after successful compilation
      await saveProject(
        currentProject,
        activeFile,
        compilationStatus,
        compilationMessage,
        isServerConnected,
        isAuthenticated
      );
    } else {
      compilationStatus = "error";
      compilationMessage = `Compilation failed: ${response.data.error}`;
      console.log("Compilation details:", response.data);
    }

    return { pdfUrl, compilationStatus, compilationMessage };
  } catch (error) {
    compilationStatus = "error";
    compilationMessage = "Compilation failed: " + error.message;
    console.error("Compilation error:", error);
  } finally {
    isCompiling = false;
    setTimeout(() => {
      compilationStatus = "";
      compilationMessage = "";
    }, 8000);
  }
};

export const checkServerConnection = async () => {
  try {
    await axios.get(`${import.meta.env.VITE_admin_server}/api/health`);
    return true;
  } catch (error) {
    console.log("Error connecting to the Backend Server");
    return false;
  }
};

// const saveProject = async () => {
//     if (!projectDetails.currentProject) return;

//     try {
//       await axios.put(
//         `${API_URL}/api/projects/${projectDetails.currentProject.id}`,
//         {
//           files: projectDetails.currentProject.files,
//           activeFile: projectDetails.activeFile,
//         }
//       );

//       updateProjectDetails({
//         compilationStatus: "success",
//         compilationMessage: "Project saved successfully",
//       });

//       setTimeout(() => {
//         updateProjectDetails({
//           compilationStatus: "",
//           compilationMessage: "",
//         });
//       }, 3000);
//     } catch (error) {
//       updateProjectDetails({
//         error: "Failed to save project: " + error.message,
//       });
//     }
//   };

//   const compileDocument = async () => {
//     if (!projectDetails.currentProject || !projectDetails.activeFile) return;

//     updateProjectDetails({
//       isCompiling: true,
//       compilationStatus: "compiling",
//       compilationMessage: "Compiling document...",
//     });

//     try {
//       const contentToCompile = projectDetails.latexContent;

//       if (
//         !contentToCompile.includes("\\begin{document}") ||
//         !contentToCompile.includes("\\end{document}")
//       ) {
//         throw new Error("Invalid LaTeX document structure");
//       }

//       console.log(
//         "Compiling LaTeX document:",
//         contentToCompile.substring(0, 200) + "..."
//       );

//       const response = await axios.post(`${API_URL}/api/compile`, {
//         content: contentToCompile,
//         projectId: projectDetails.currentProject.id,
//       });

//       if (response.data.success) {
//         const pdfBlob = new Blob(
//           [Uint8Array.from(atob(response.data.pdf), (c) => c.charCodeAt(0))],
//           { type: "application/pdf" }
//         );
//         const newPdfUrl = URL.createObjectURL(pdfBlob);

//         if (projectDetails.pdfUrl) {
//           URL.revokeObjectURL(projectDetails.pdfUrl);
//         }

//         updateProjectDetails({
//           pdfUrl: newPdfUrl,
//           compilationStatus: "success",
//           compilationMessage: "PDF compiled successfully!",
//         });

//         await saveProject();
//       } else {
//         updateProjectDetails({
//           compilationStatus: "error",
//           compilationMessage: `Compilation failed: ${response.data.error}`,
//         });
//       }
//     } catch (error) {
//       updateProjectDetails({
//         compilationStatus: "error",
//         compilationMessage: "Compilation failed: " + error.message,
//       });
//       console.error("Compilation error:", error);
//     } finally {
//       updateProjectDetails({ isCompiling: false });
//       setTimeout(() => {
//         updateProjectDetails({
//           compilationStatus: "",
//           compilationMessage: "",
//         });
//       }, 8000);
//     }
//   };
