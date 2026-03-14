/*Functions in this file:
- createProject()
- editDocumentWithAI()      //AI Chat
- saveChatMessage()         //AI Chat
- loadChatHistory()         //AI Chat
- loadProjects()
- loadProject()
- loadProjectFromServer()
- saveProject()
- compileDocument():
- checkServerConnection();
- saveDraftVersion()        //Draft Versioning
- loadDraftVersion()        //Draft Versioning
- saveSettings              //Settings
- loadSettings              //Settings
*/

import axios from "axios";

const API_URL = "http://localhost:5000";

export const createProject = async (
  title,
  authorDetails,
  userIdea,
  isGenChecked,
  Owner,
  templateType,
  templateSource,
  e,
) => {
  e.preventDefault();
  if (!title) return;

  try {
    // Fix boilerplate generation for Blank Document
    const typeToSend =
      templateType === "blank" ? "Blank Document" : templateType || "blank";

    console.log("CreateProject Payload:", { title, typeToSend, isGenChecked, templateSource });

    const payload = {
      title,
      authorDetails,
      generateBoilerplate: isGenChecked,
      userIdea: isGenChecked ? userIdea : null,
      Owner: Owner || null,
      templateType: typeToSend,
      templateSource: templateSource || "local",
    };

    const response = await axios.post(
      `${API_URL}/api/projects/create`,
      payload,
    );
    console.log(`Project Successfully Created - ${title}`);
    return response.data.project.id; // Return project ID for navigation
  } catch (error) {
    console.log("Failed to create project: " + error.message);
    throw error;
  }
};

export const editDocumentWithAI = async (
  prompt,
  currentLatex,
  signal = null,
  context = null,
  fileMap = null,
) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/edit`,
      {
        prompt,
        latexContent: currentLatex,
        context,
        fileMap,
      },
      { signal }, // Pass abort signal to axios
    );
    return response.data; // Returns { success, latexContent, fileUpdates, changedSnippet }
  } catch (error) {
    console.error("AI Edit Failed:", error);
    throw error;
  }
};

export const saveChatMessage = async (projectId, message) => {
  try {
    await axios.post(`${API_URL}/api/projects/${projectId}/chat/save`, {
      message,
    });
  } catch (error) {
    console.error("Failed to save chat message:", error);
  }
};

export const loadChatHistory = async (projectId) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/projects/${projectId}/chat`,
    );
    return response.data.history || [];
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return [];
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
  isAuthenticated,
) => {
  if (!currentProject) return;
  console.log("From saveProject", currentProject);
  console.log("From saveProject", isServerConnected);
  console.log("From saveProject", isAuthenticated);

  try {
    await axios.put(`${API_URL}/api/projects/${currentProject.id}`, {
      files: currentProject.files,
      owner: currentProject.owner,
      activeFile: activeFile,
      title: currentProject.title,
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
          },
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
  isAuthenticated,
) => {
  if (!currentProject || !activeFile) return;

  //Logic (Clint):
  // 1. rootFile will be the root file. Validate if the content of activeFile is valid LaTeX
  // 2. Send all the dependend file to the backend (Basically project.json via currentProject.file)

  const rootFile = activeFile;

  //For Debugging (FIXME: Delete Later)
  console.log("currentProject", currentProject);
  console.log("pdfUrl", pdfUrl);
  console.log("ProjectId", currentProject.id);
  console.log("currentProject Content", currentProject.files[rootFile].content);
  // console.log("latexContent", latexContent);

  isCompiling = true;
  compilationStatus = "compiling";
  compilationMessage = "Compiling document...";

  try {
    const contentToCompile = currentProject.files[rootFile].content;

    if (
      !contentToCompile.includes("\\begin{document}") ||
      !contentToCompile.includes("\\end{document}")
    ) {
      throw new Error("Invalid LaTeX document structure");
    }

    const response = await axios.post(`${API_URL}/api/compile`, {
      content: contentToCompile,
      files: currentProject.files,
      projectId: currentProject.id,
    });

    let fileName = null;

    if (response.data.success) {
      pdfUrl = `${API_URL}/output/${response.data.fileName}?t=${Date.now()}`;
      compilationStatus = "success";
      compilationMessage = "PDF compiled successfully!";
      fileName = response.data.fileName;

      await saveProject(
        currentProject,
        activeFile,
        compilationStatus,
        compilationMessage,
        isServerConnected,
        isAuthenticated,
      );
    } else {
      compilationStatus = "error";
      compilationMessage = `Compilation failed: ${response.data.log}`;
      console.log("Compilation details:", response.data);
    }

    // 3. RETURN THE FILENAME SO EDITORPAGE CAN USE IT
    return { pdfUrl, compilationStatus, compilationMessage, fileName };
  } catch (error) {
    compilationStatus = "error";
    compilationMessage = "Compilation failed: " + error.message;
    console.error("Compilation error:", error);
    return { pdfUrl, compilationStatus, compilationMessage, fileName: null };
  } finally {
    isCompiling = false;
    setTimeout(() => {
      compilationStatus = "";
      compilationMessage = "";
    }, 8000);
  }
};

export const checkServerConnection = async () => {
  console.log("from checkServerConnection");
  try {
    await axios.get(`${import.meta.env.VITE_admin_server}/api/health`);
    return true;
  } catch (error) {
    console.log("Error connecting to the Backend Server", error);
    return false;
  }
};

export const createDraftVersion = async (
  projectId,
  name,
  description,
  files,
  isAuthenticated,
  isServerConnected,
) => {
  if (!projectId) throw new Error("ProjectId is required");
  try {
    const response = await axios.post(`${API_URL}/api/drafts/${projectId}`, {
      name: name,
      description: description,
      files: files,
    });

    console.log(response.data.draftData);

    if (isServerConnected && isAuthenticated) {
      try {
        await axios.put(
          `${import.meta.env.VITE_admin_server}/api/drafts/${projectId}`,
          {
            content: response.data.draftData,
          },
        );
      } catch (error) {
        console.log("Failed to save project to DB: " + error.message);
      }
    }
  } catch (error) {
    console.error("Error creating Draft:", error);
    throw error;
  }
};

export const loadDraftVersion = async (projectId) => {
  if (!projectId) throw new Error("ProjectId is required");
  try {
    const responses = await axios.get(`${API_URL}/api/drafts/${projectId}`, {});

    return responses.data;
  } catch (error) {
    console.error("Error Loading Draft:", error);
    throw error;
  }
};

export const saveSettings = async (settings) => {
  try {
    const response = await axios.patch(`${API_URL}/api/settings/`, {
      settings: settings,
    });

    console.log(response.data);
  } catch (error) {
    console.error("Error Updating Settings:", error);
    throw error;
  }
};

export const loadSettings = async () => {
  try {
    const responses = await axios.get(`${API_URL}/api/settings`, {});

    return responses.data;
  } catch (error) {
    console.error("Error Loading Settings:", error);
    throw error;
  }
};
