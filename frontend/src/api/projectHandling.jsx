/*Functions in this file:
- createProject()
- loadProjects(): setIsLoading, setProjects, loadProject(), setError
- loadProject()
- saveProject()
- compileDocument()
*/

// const [isLoading, setIsLoading] = useState(false);
import axios from "axios";

const API_URL = "http://localhost:5000";

export const createProject = async (
  title,
  authorDetails,
  userIdea,
  isGenChecked,
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

// export const saveProject = async () => {
//   if (!currentProject) return;

//   try {
//     await axios.put(`${API_URL}/api/projects/${currentProject.id}`, {
//       files: currentProject.files,
//       activeFile: activeFile,
//     });

//     setCompilationStatus("success");
//     setCompilationMessage("Project saved successfully");
//     setTimeout(() => {
//       setCompilationStatus("");
//       setCompilationMessage("");
//     }, 3000);
//   } catch (error) {
//     setError("Failed to save project: " + error.message);
//   }
// };

// export const compileDocument = async () => {
//   if (!currentProject || !activeFile) return;

//   setIsCompiling(true);
//   setCompilationStatus("compiling");
//   setCompilationMessage("Compiling document...");

//   try {
//     // Use the current LaTeX content for compilation
//     const contentToCompile = latexContent;

//     // Validate document before compilation
//     if (
//       !contentToCompile.includes("\\begin{document}") ||
//       !contentToCompile.includes("\\end{document}")
//     ) {
//       throw new Error("Invalid LaTeX document structure");
//     }

//     console.log(
//       "Compiling LaTeX document:",
//       contentToCompile.substring(0, 200) + "..."
//     );

//     const response = await axios.post(`${API_URL}/api/compile`, {
//       content: contentToCompile,
//       projectId: currentProject.id,
//     });

//     if (response.data.success) {
//       const pdfBlob = new Blob(
//         [Uint8Array.from(atob(response.data.pdf), (c) => c.charCodeAt(0))],
//         { type: "application/pdf" }
//       );
//       const newPdfUrl = URL.createObjectURL(pdfBlob);

//       if (pdfUrl) {
//         URL.revokeObjectURL(pdfUrl);
//       }

//       setPdfUrl(newPdfUrl);
//       setCompilationStatus("success");
//       setCompilationMessage("PDF compiled successfully!");

//       // Auto-save after successful compilation
//       await saveProject();
//     } else {
//       setCompilationStatus("error");
//       setCompilationMessage(`Compilation failed: ${response.data.error}`);
//       console.log("Compilation details:", response.data);
//     }
//   } catch (error) {
//     setCompilationStatus("error");
//     setCompilationMessage("Compilation failed: " + error.message);
//     console.error("Compilation error:", error);
//   } finally {
//     setIsCompiling(false);
//     setTimeout(() => {
//       setCompilationStatus("");
//       setCompilationMessage("");
//     }, 8000);
//   }
// };
