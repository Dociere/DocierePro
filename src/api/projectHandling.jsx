/*Functions in this file:
- createProject()
- uploadZipProject()
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
import { useSettings } from "../context/useSettings";

const API_URL = "http://localhost:5000";

export const api = axios.create({
  withCredentials: true,
});

export const createProject = async (
  title,
  authorDetails,
  userIdea,
  isGenChecked,
  Owner,
  templateType,
  templateSource,
  e,
  aiConfig, // <-- 1. Add this parameter
) => {
  if (e && e.preventDefault) e.preventDefault();
  if (!title) return;

  try {
    const typeToSend =
      templateType === "blank" ? "Blank Document" : templateType || "blank";

    // 2. Clean the config (mask handling)
    const cleanConfig = aiConfig ? { ...aiConfig } : null;
    if (cleanConfig && cleanConfig.apiKey === "********") {
      delete cleanConfig.apiKey;
    }

    const payload = {
      title,
      authorDetails,
      generateBoilerplate: isGenChecked,
      userIdea: isGenChecked ? userIdea : null,
      Owner: Owner || null,
      templateType: typeToSend,
      templateSource: templateSource || "local",
      aiConfig: cleanConfig, // <-- 3. Add to payload
    };

    const response = await axios.post(
      `${API_URL}/api/projects/create`,
      payload,
      { withCredentials: true }, // <-- 4. CRITICAL for decryption
    );

    console.log(`Project Successfully Created - ${title}`);
    return response.data.project.id;
  } catch (error) {
    console.error(
      "Failed to create project:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const uploadZipProject = async (file) => {
  if (!file) return;
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      `${API_URL}/api/projects/upload`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      },
    );

    console.log(
      `Zip Project Successfully Uploaded - ${response.data.project.title}`,
    );
    return response.data.project.id;
  } catch (error) {
    console.error(
      "Failed to upload zip project:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const deleteProjectFromDisk = async (projectId) => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/projects/delete/${projectId}`,
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error("API Error during deletion:", error);
    throw error;
  }
};

export const editDocumentWithAI = async (
  prompt,
  latexContent,
  signal = null,
  context = null,
  fileMap = null,
  aiConfig,
) => {
  try {
    const cleanConfig = { ...aiConfig };
    if (cleanConfig.apiKey === "********" || cleanConfig.apiKey === "") {
      delete cleanConfig.apiKey;
    }

    const payload = {
      prompt,
      latexContent,
      context,
      fileMap,
      aiConfig: cleanConfig, // use cleanConfig, not the original
    };

    // Make sure withCredentials is true so the auth cookie is sent!
    const response = await axios.post(`${API_URL}/api/edit`, payload, {
      signal,
      withCredentials: true, // <-- 3. CRITICAL for decryption to work
    });

    return response.data;
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log("Request canceled by user");
      throw new Error("Request canceled");
    }
    console.error("Error editing document with AI:", error);
    throw error;
  }
};

export const fetchDecryptedSecret = async (configId, SERVER_API) => {
  try {
    // const response = await axios.get(
    //   `${import.meta.env.VITE_admin_server}/api/aiconfigs/secret/${configId}`,
    //   { withCredentials: true },
    // );

    const response = await axios.get(
      `${SERVER_API}/api/aiconfigs/secret/${configId}`,
      { withCredentials: true },
    );
    return response.data.apiKey;
  } catch (error) {
    console.error("Failed to fetch secret:", error);
    throw error;
  }
};

export const saveChatMessage = async (
  projectId,
  message,
  { isServerConnected, isAuthenticated, userId } = {},
) => {
  try {
    await axios.post(`${API_URL}/api/projects/${projectId}/chat/save`, {
      message,
    });

    // Sync full chat history to cloud after local save
    if (isServerConnected && isAuthenticated && userId) {
      try {
        const history = await loadChatHistory(projectId);
        // await axios.put(
        //   `${
        //     import.meta.env.VITE_admin_server
        //   }/api/ai-chat/${userId}/${projectId}`,
        //   { messages: history },
        //   { withCredentials: true },
        // );
        await api.put(`/api/ai-chat/${userId}/${projectId}`, {
          messages: history,
        });
      } catch (syncError) {
        console.log("Failed to sync chat to cloud:", syncError.message);
      }
    }
  } catch (error) {
    console.error("Failed to save chat message:", error);
  }
};

export const loadChatHistory = async (
  projectId,
  { isServerConnected, isAuthenticated, userId } = {},
) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/projects/${projectId}/chat`,
    );
    const localHistory = response.data.history || [];

    if (isServerConnected && isAuthenticated && userId) {
      if (localHistory.length === 0) {
        // Pull from cloud if local is empty (e.g. new device)
        try {
          // const cloudRes = await axios.get(
          //   `${
          //     import.meta.env.VITE_admin_server
          //   }/api/ai-chat/${userId}/${projectId}`,
          //   { withCredentials: true },
          // );

          const cloudRes = await api.get(`/api/ai-chat/${userId}/${projectId}`);

          const cloudMessages = cloudRes.data.messages || [];
          if (cloudMessages.length > 0) {
            for (const msg of cloudMessages) {
              await axios.post(
                `${API_URL}/api/projects/${projectId}/chat/save`,
                { message: msg },
              );
            }
            return cloudMessages;
          }
        } catch (cloudError) {
          console.log("Failed to fetch chat from cloud:", cloudError.message);
        }
      } else {
        // Push existing local history to cloud (initial sync for pre-existing chat.json)
        try {
          // await axios.put(
          //   `${
          //     import.meta.env.VITE_admin_server
          //   }/api/ai-chat/${userId}/${projectId}`,
          //   { messages: localHistory },
          //   { withCredentials: true },
          // );

          await api.put(`/api/ai-chat/${userId}/${projectId}`, {
            messages: localHistory,
          });

          console.log("✅ Synced existing chat history to cloud");
        } catch (syncError) {
          console.log(
            "Failed to sync existing chat to cloud:",
            syncError.message,
          );
        }
      }
    }

    return localHistory;
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
      rootFile: currentProject.rootFile,
    });

    if (isServerConnected && isAuthenticated) {
      try {
        // await axios.put(
        //   `${import.meta.env.VITE_admin_server}/api/projects/${
        //     currentProject.id
        //   }`,
        //   {
        //     files: currentProject.files,
        //     owner: currentProject.owner,
        //     title: currentProject.title,
        //     activeFile: activeFile,
        //     rootFile: currentProject.rootFile,
        //   },
        // );

        await api.put(`/api/projects/${currentProject.id}`, {
          files: currentProject.files,
          owner: currentProject.owner,
          title: currentProject.title,
          activeFile: activeFile,
          rootFile: currentProject.rootFile,
        });
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

  const rootFile = currentProject.rootFile || activeFile || "main.tex";

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

    const hasBegin = contentToCompile.includes("\\begin{document}");
    const hasEnd = contentToCompile.includes("\\end{document}");

    if (!hasBegin || !hasEnd) {
      const missing =
        !hasBegin && !hasEnd
          ? "both tags"
          : !hasBegin
          ? "\\begin{document}"
          : "\\end{document}";
      console.error(
        `❌ Pre-flight check failed: Missing ${missing} in ${rootFile}`,
      );
      throw new Error(
        `Invalid LaTeX structure: ${rootFile} is missing required tags.`,
      );
    }

    const response = await axios.post(
      `${API_URL}/api/compile`,
      {
        content: contentToCompile,
        files: currentProject.files,
        projectId: currentProject.id,
        activeFile: rootFile,
      },
      { responseType: "blob" },
    ); // <-- Handle binary stream

    let fileName = `${currentProject.id || "temp"}.pdf`;

    // 1. Success case: server returns PDF stream
    if (response.status === 200 && response.data.type === "application/pdf") {
      // Create a local URL for the blob
      pdfUrl = URL.createObjectURL(response.data);
      compilationStatus = "success";
      compilationMessage = "PDF compiled successfully!";

      // 2. Fetch logs indirectly based on header, avoiding massive header payloads
      const logFileName = response.headers["x-log-file"];
      let logs = "";
      if (logFileName) {
        try {
          const logRes = await fetch(`${API_URL}/output/${logFileName}`);
          if (logRes.ok) {
            logs = await logRes.text();
            console.log("Compilation logs fetched from server.");
          }
        } catch (e) {
          console.error("Failed to fetch logs payload", e);
        }
      }

      await saveProject(
        currentProject,
        activeFile,
        compilationStatus,
        compilationMessage,
        isServerConnected,
        isAuthenticated,
      );

      return { pdfUrl, compilationStatus, compilationMessage, fileName, logs };
    } else {
      // 3. Fallback for potential JSON responses if handled differently
      compilationStatus = "error";
      compilationMessage = "Compilation failed: unexpected response format";
      return { pdfUrl, compilationStatus, compilationMessage, fileName: null };
    }
  } catch (error) {
    compilationStatus = "error";
    let message = error.message;
    let logs = "";

    // Convert blob error to text if possible
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        message = json.error || json.message || text;
        logs = json.log || "";
      } catch (e) {
        console.error("Failed to parse error blob", e);
      }
    }

    compilationMessage = "Compilation failed: " + message;
    console.error("Compilation error:", error);

    // TRY TO FETCH RAW LOGS EVEN ON FAILURE
    const logFileName = error.response?.headers?.["x-log-file"];
    if (logFileName) {
      try {
        const logRes = await fetch(`${API_URL}/output/${logFileName}`);
        if (logRes.ok) {
          logs = await logRes.text();
          console.log(
            "Detailed compilation logs fetched from server on failure.",
          );
        }
      } catch (e) {
        console.error("Failed to fetch logs payload on failure", e);
      }
    }

    return {
      pdfUrl,
      compilationStatus,
      compilationMessage,
      fileName: null,
      logs,
    };
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
    // await axios.get(`${import.meta.env.VITE_admin_server}/api/health`);
    await api.get(`/api/health`);
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
        // await axios.put(
        //   `${import.meta.env.VITE_admin_server}/api/drafts/${projectId}`,
        //   {
        //     content: response.data.draftData,
        //   },
        // );

        await api.put(`/api/drafts/${projectId}`, {
          content: response.data.draftData,
        });
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

export const fetchAIConfigsFromCloud = async () => {
  try {
    // const response = await axios.get(
    //   `${import.meta.env.VITE_admin_server}/api/aiconfigs`,
    //   {
    //     withCredentials: true,
    //   },
    // );

    const response = await api.get(`/api/aiconfigs`);

    return response.data.configs || [];
  } catch (error) {
    console.error("Failed to fetch AI configs from cloud", error);
    return [];
  }
};

export const saveAIConfigsToCloud = async (configs) => {
  try {
    // const response = await axios.post(
    //   `${import.meta.env.VITE_admin_server}/api/aiconfigs`,
    //   { configs },
    //   { withCredentials: true },
    // );

    const response = await api.post(`/api/aiconfigs`, { configs });

    return response.data;
  } catch (error) {
    console.error("Failed to save AI configs to cloud", error);
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

export const syncEquationsToCloud = async (
  projectId,
  equations,
  { isServerConnected, isAuthenticated, userId } = {},
) => {
  if (!isServerConnected || !isAuthenticated || !userId) return;
  try {
    // await axios.put(
    //   `${
    //     import.meta.env.VITE_admin_server
    //   }/api/equations/${userId}/${projectId}`,
    //   { items: equations },
    //   { withCredentials: true },
    // );

    await api.put(`/api/equations/${userId}/${projectId}`, {
      items: equations,
    });
  } catch (error) {
    console.error("Failed to sync equations to cloud:", error.message);
  }
};

export const pullEquationsFromCloud = async (
  projectId,
  { isServerConnected, isAuthenticated, userId } = {},
) => {
  if (!isServerConnected || !isAuthenticated || !userId) return [];
  try {
    // const res = await axios.get(
    //   `${
    //     import.meta.env.VITE_admin_server
    //   }/api/equations/${userId}/${projectId}`,
    //   { withCredentials: true },
    // );

    const res = await api.get(`/api/equations/${userId}/${projectId}`);

    return res.data.items || [];
  } catch (error) {
    console.error("Failed to pull equations from cloud:", error.message);
    return [];
  }
};

export const syncCitationsToCloud = async (
  projectId,
  citations,
  { isServerConnected, isAuthenticated, userId } = {},
) => {
  if (!isServerConnected || !isAuthenticated || !userId) return;
  try {
    // await axios.put(
    //   `${
    //     import.meta.env.VITE_admin_server
    //   }/api/citations/${userId}/${projectId}`,
    //   { items: citations },
    //   { withCredentials: true },
    // );

    await api.put(`/api/citations/${userId}/${projectId}`, {
      items: citations,
    });
  } catch (error) {
    console.error("Failed to sync citations to cloud:", error.message);
  }
};

export const pullCitationsFromCloud = async (
  projectId,
  { isServerConnected, isAuthenticated, userId } = {},
) => {
  if (!isServerConnected || !isAuthenticated || !userId) return [];
  try {
    // const res = await axios.get(
    //   `${
    //     import.meta.env.VITE_admin_server
    //   }/api/citations/${userId}/${projectId}`,
    //   { withCredentials: true },
    // );

    const res = await api.get(`/api/citations/${userId}/${projectId}`);
    return res.data.items || [];
  } catch (error) {
    console.error("Failed to pull citations from cloud:", error.message);
    return [];
  }
};

export const renameProject = async (projectId, newTitle) => {
  try {
    const response = await axios.put(
      `${API_URL}/api/projects/rename/${projectId}`,
      {
        title: newTitle,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Failed to rename project:", error);
    throw error;
  }
};

export const renameUserTemplate = async (oldName, newName) => {
  try {
    const response = await axios.put(`${API_URL}/api/templates/rename`, {
      oldName,
      newName,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to rename user template:", error);
    throw error;
  }
};

export const deleteUserTemplate = async (name) => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/templates/delete/${name}`,
    );
    return response.data;
  } catch (error) {
    console.error("Failed to delete user template:", error);
    throw error;
  }
};
