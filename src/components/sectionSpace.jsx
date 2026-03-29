// import React, { useContext, useState, useRef as useReactRef } from "react";
// import { projectContext } from "../context/useProject";
// import { useSettings } from "../context/useSettings";
// import { saveProject } from "../api/projectHandling";
// import { useAuth } from "../context/useAuth";
// import AddFileIcon from "../assets/icons/addFile.svg?react";
// import AddFolderIcon from "../assets/icons/addFolder.svg?react";
// import UploadFileIcon from "../assets/icons/upload.svg?react";
// import axios from "axios";
// import { TbAlertTriangle, TbCheck, TbX } from "react-icons/tb";

// // Confirmation Modal Component
// const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
//   if (!isOpen) return null;
//   return (
//     <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
//       <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
//         <div className="flex items-center gap-3 mb-4">
//           <TbAlertTriangle className="text-amber-500" size={24} />
//           <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
//         </div>
//         <p className="text-gray-600 mb-6">{message}</p>
//         <div className="flex justify-end gap-3">
//           <button
//             onClick={onCancel}
//             className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={onConfirm}
//             className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-medium"
//           >
//             Confirm
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // Alert Modal Component
// const AlertModal = ({ isOpen, message, onClose }) => {
//   if (!isOpen) return null;
//   return (
//     <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
//       <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
//         <div className="flex items-center gap-3 mb-4">
//           <TbAlertTriangle className="text-amber-500" size={24} />
//           <h3 className="text-lg font-semibold text-gray-900">Notice</h3>
//         </div>
//         <p className="text-gray-600 mb-6">{message}</p>
//         <div className="flex justify-end">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-medium"
//           >
//             OK
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // Toast Component
// const Toast = ({ message, isVisible }) => {
//   if (!isVisible) return null;
//   return (
//     <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
//       <TbCheck size={16} className="text-green-400" />
//       <span className="text-sm">{message}</span>
//     </div>
//   );
// };

// const SectionSpace = ({ width = 256, onDragStart }) => {
//   const { projectDetails, updateProjectDetails } = useContext(projectContext);
//   const { currentProject, activeFile, compilationStatus, compilationMessage } =
//     projectDetails;
//   const { settings } = useSettings();
//   const { user, isServerConnected, isAuthenticated } = useAuth();

//   const [isCreatingFile, setIsCreatingFile] = useState(false);
//   const [newFileName, setNewFileName] = useState("");
//   const [error, setError] = useState("");
//   const [isUploading, setIsUploading] = useState(false);
//   const [toast, setToast] = useState(null);
//   const [alertMessage, setAlertMessage] = useState(null);
//   const [confirmModal, setConfirmModal] = useState({
//     isOpen: false,
//     title: "",
//     message: "",
//     onConfirm: null,
//   });
//   const [uploadPendingFiles, setUploadPendingFiles] = useState([]);
//   const [uploadOverwriteFile, setUploadOverwriteFile] = useState(null);
//   const [renamingFile, setRenamingFile] = useState(null);
//   const [renameValue, setRenameValue] = useState("");
//   const renameInputRef = useReactRef(null);

//   // Folder state
//   const [isCreatingFolder, setIsCreatingFolder] = useState(false);
//   const [newFolderName, setNewFolderName] = useState("");
//   const [expandedFolders, setExpandedFolders] = useState({});
//   const [renamingFolder, setRenamingFolder] = useState(null);
//   const [renameFolderValue, setRenameFolderValue] = useState("");
//   const renameFolderInputRef = useReactRef(null);

//   const fileInputRef = React.useRef(null);

//   const isDark = settings.appearance.mode === "dark";

//   const [menuState, setMenuState] = useState(null);

//   React.useEffect(() => {
//     const handleClickOutside = () => setMenuState(null);
//     document.addEventListener("click", handleClickOutside);
//     document.addEventListener("scroll", handleClickOutside, true);
//     return () => {
//       document.removeEventListener("click", handleClickOutside);
//       document.removeEventListener("scroll", handleClickOutside, true);
//     };
//   }, []);

//   const handleSetMainFile = async (e, fileName) => {
//     e.stopPropagation();
//     setMenuState(null);

//     const updatedProject = {
//       ...currentProject,
//       rootFile: fileName,
//     };

//     updateProjectDetails({
//       currentProject: updatedProject,
//     });

//     await saveProject(
//       updatedProject,
//       activeFile,
//       compilationStatus,
//       compilationMessage,
//       isServerConnected,
//       isAuthenticated,
//     );
//     showToast(`Set "${fileName}" as the main root file`);
//   };

//   const handleFileClick = (fileName) => {
//     // If switching files, save the current file content back to the project first?
//     // The textEditor usually updates the 'latexContent' in context.
//     // We should ensure 'latexContent' is saved to the 'files' object before switching.

//     // However, the textEditor likely updates `currentProject.files[activeFile].content`
//     // or just `latexContent`. Let's assume for now we just switch the view.
//     // A more robust implementation would ensure state sync.

//     updateProjectDetails({
//       activeFile: fileName,
//       latexContent: currentProject.files[fileName]?.content || "",
//     });
//   };

//   const handleAddFile = async (e) => {
//     e.preventDefault();
//     setError(""); // Clear previous errors

//     if (!currentProject) return;
//     if (!newFileName.trim()) {
//       setError("File name cannot be empty");
//       return;
//     }

//     try {
//       // Auto-append .tex if no extension provided
//       let finalName = newFileName.trim();
//       if (!finalName.includes(".")) {
//         finalName += ".tex";
//       }

//       if (currentProject.files[finalName]) {
//         setError("File already exists");
//         return;
//       }

//       const newFile = {
//         name: finalName,
//         content: "",
//         type: finalName.split(".").pop(),
//       };

//       const updatedProject = {
//         ...currentProject,
//         files: {
//           ...currentProject.files,
//           [finalName]: newFile,
//         },
//       };

//       // Update context first for instant UI feedback
//       updateProjectDetails({
//         currentProject: updatedProject,
//         activeFile: finalName,
//         latexContent: "",
//       });

//       // Persist to server
//       await saveProject(
//         updatedProject,
//         finalName,
//         compilationStatus,
//         compilationMessage,
//         isServerConnected,
//         isAuthenticated,
//       );

//       setIsCreatingFile(false);
//       setNewFileName("");
//     } catch (err) {
//       console.error("Failed to add file:", err);
//       setError("Failed to create file on server");
//     }
//   };

//   const showToast = (message) => {
//     setToast(message);
//     setTimeout(() => setToast(null), 2000);
//   };

//   const handleDeleteFile = async (e, fileName) => {
//     e.stopPropagation(); // Prevent file selection when clicking delete

//     setConfirmModal({
//       isOpen: true,
//       title: "Delete File",
//       message: `Are you sure you want to delete ${fileName}?`,
//       onConfirm: async () => {
//         setConfirmModal({
//           isOpen: false,
//           title: "",
//           message: "",
//           onConfirm: null,
//         });
//         try {
//           const response = await axios.delete(
//             `http://localhost:5000/api/projects/${currentProject.id}/files/${encodeURIComponent(fileName)}`,
//           );

//           if (response.data.success) {
//             let updatedProject = response.data.project;
//             let needsSave = false;

//             if (updatedProject.rootFile === fileName) {
//               updatedProject.rootFile = null;
//               needsSave = true;
//             }

//             // Determine next file to focus if we deleted the active one
//             let nextActiveFile = activeFile;
//             if (activeFile === fileName) {
//               const texFiles = Object.keys(updatedProject.files).filter((f) =>
//                 f.endsWith(".tex"),
//               );
//               nextActiveFile = texFiles.length > 0 ? texFiles[0] : null;
//             }

//             updateProjectDetails({
//               currentProject: updatedProject,
//               activeFile: nextActiveFile,
//               latexContent: nextActiveFile
//                 ? updatedProject.files[nextActiveFile]?.content || ""
//                 : "",
//             });

//             if (needsSave) {
//               await saveProject(
//                 updatedProject,
//                 nextActiveFile,
//                 compilationStatus,
//                 compilationMessage,
//                 isServerConnected,
//                 isAuthenticated,
//               );
//             }

//             showToast(`Deleted ${fileName}`);
//           }
//         } catch (err) {
//           console.error("Delete failed:", err);
//           setError("Failed to delete file");
//         }
//       },
//     });
//   };

//   // Handle file upload - reads file client-side and adds to project
//   const handleFileUpload = async (e) => {
//     const files = e.target.files;
//     if (!files || files.length === 0 || !currentProject) return;

//     setIsUploading(true);
//     setError("");

//     try {
//       const newFiles = { ...currentProject.files };
//       const filesToProcess = Array.from(files);
//       let skippedCount = 0;

//       for (const file of filesToProcess) {
//         const fileName = file.name;

//         // Check if file already exists - skip with info (no blocking confirm)
//         if (newFiles[fileName]) {
//           // Overwrite silently if same name
//           console.log(`Overwriting existing file: ${fileName}`);
//         }

//         // Determine file type
//         const isImage = /\.(png|jpg|jpeg|gif|svg|pdf|eps)$/i.test(fileName);
//         const isText = /\.(tex|bib|sty|cls|txt)$/i.test(fileName);

//         if (isImage) {
//           // Read as base64 data URL
//           const dataUrl = await new Promise((resolve, reject) => {
//             const reader = new FileReader();
//             reader.onload = () => resolve(reader.result);
//             reader.onerror = reject;
//             reader.readAsDataURL(file);
//           });

//           newFiles[fileName] = {
//             name: fileName,
//             content: dataUrl,
//             type: fileName.split(".").pop(),
//             isImage: true,
//           };
//         } else if (isText) {
//           // Read as text
//           const content = await new Promise((resolve, reject) => {
//             const reader = new FileReader();
//             reader.onload = () => resolve(reader.result);
//             reader.onerror = reject;
//             reader.readAsText(file);
//           });

//           newFiles[fileName] = {
//             name: fileName,
//             content: content,
//             type: fileName.split(".").pop(),
//           };
//         } else {
//           // Unsupported file type
//           console.warn(`Skipping unsupported file type: ${fileName}`);
//           skippedCount++;
//           continue;
//         }
//       }

//       // Update project with new files
//       const updatedProject = {
//         ...currentProject,
//         files: newFiles,
//       };

//       updateProjectDetails({
//         currentProject: updatedProject,
//       });

//       // Save to server
//       await saveProject(
//         updatedProject,
//         activeFile,
//         compilationStatus,
//         compilationMessage,
//         isServerConnected,
//         isAuthenticated,
//       );

//       const uploadedCount = filesToProcess.length - skippedCount;
//       if (uploadedCount > 0) {
//         showToast(
//           `Uploaded ${uploadedCount} file${uploadedCount > 1 ? "s" : ""}`,
//         );
//       }
//     } catch (err) {
//       console.error("Upload failed:", err);
//       setError("Failed to upload file: " + err.message);
//     } finally {
//       setIsUploading(false);
//       if (fileInputRef.current) {
//         fileInputRef.current.value = "";
//       }
//     }
//   };

//   // Handle file rename
//   const handleRenameStart = (e, fileName) => {
//     e.stopPropagation();
//     setRenamingFile(fileName);
//     setRenameValue(fileName);
//     setTimeout(() => renameInputRef.current?.select(), 50);
//   };

//   const handleRenameSubmit = async (oldName) => {
//     const newName = renameValue.trim();
//     setRenamingFile(null);

//     if (!newName || newName === oldName) return;

//     // Validate
//     if (currentProject.files[newName]) {
//       setAlertMessage(`A file named "${newName}" already exists.`);
//       return;
//     }

//     try {
//       // Build updated files: copy data under new key, remove old key
//       const updatedFiles = {};
//       for (const [key, value] of Object.entries(currentProject.files)) {
//         if (key === oldName) {
//           updatedFiles[newName] = {
//             ...value,
//             name: newName,
//             type: newName.split(".").pop(),
//           };
//         } else {
//           updatedFiles[key] = value;
//         }
//       }

//       const updatedProject = { ...currentProject, files: updatedFiles };

//       if (updatedProject.rootFile === oldName) {
//         updatedProject.rootFile = newName;
//       }

//       // If the renamed file was active, switch active to new name
//       const nextActive = activeFile === oldName ? newName : activeFile;

//       updateProjectDetails({
//         currentProject: updatedProject,
//         activeFile: nextActive,
//         latexContent: nextActive
//           ? updatedProject.files[nextActive]?.content || ""
//           : "",
//       });

//       await saveProject(
//         updatedProject,
//         nextActive,
//         compilationStatus,
//         compilationMessage,
//         isServerConnected,
//         isAuthenticated,
//       );

//       showToast(`Renamed to ${newName}`);
//     } catch (err) {
//       console.error("Rename failed:", err);
//       setAlertMessage("Failed to rename file.");
//     }
//   };

//   // ============ FOLDER HANDLERS ============

//   const handleAddFolder = (e) => {
//     e.preventDefault();
//     setError("");
//     if (!currentProject) return;
//     const name = newFolderName.trim();
//     if (!name) {
//       setError("Folder name cannot be empty");
//       return;
//     }
//     if (name.includes("/") || name.includes("\\")) {
//       setError("Folder name cannot contain slashes");
//       return;
//     }

//     // Check if folder already exists by looking for any key with this prefix
//     const folderPrefix = name + "/";
//     const exists = Object.keys(currentProject.files).some((k) =>
//       k.startsWith(folderPrefix),
//     );
//     if (exists) {
//       setError("Folder already exists");
//       return;
//     }

//     // Create a placeholder .gitkeep so the folder persists
//     const placeholderKey = `${name}/.gitkeep`;
//     const updatedProject = {
//       ...currentProject,
//       files: {
//         ...currentProject.files,
//         [placeholderKey]: { name: ".gitkeep", content: "", type: "gitkeep" },
//       },
//     };

//     updateProjectDetails({ currentProject: updatedProject });
//     setExpandedFolders((prev) => ({ ...prev, [name]: true }));
//     saveProject(
//       updatedProject,
//       activeFile,
//       compilationStatus,
//       compilationMessage,
//       isServerConnected,
//       isAuthenticated,
//     );
//     setIsCreatingFolder(false);
//     setNewFolderName("");
//     showToast(`Created folder ${name}`);
//   };

//   const handleFolderToggle = (folderName) => {
//     setExpandedFolders((prev) => ({
//       ...prev,
//       [folderName]: !prev[folderName],
//     }));
//   };

//   const handleFolderRenameStart = (e, folderName) => {
//     e.stopPropagation();
//     setRenamingFolder(folderName);
//     setRenameFolderValue(folderName);
//     setTimeout(() => renameFolderInputRef.current?.select(), 50);
//   };

//   const handleFolderRenameSubmit = async (oldFolder) => {
//     const newFolder = renameFolderValue.trim();
//     setRenamingFolder(null);
//     if (!newFolder || newFolder === oldFolder) return;
//     if (newFolder.includes("/") || newFolder.includes("\\")) {
//       setAlertMessage("Folder name cannot contain slashes.");
//       return;
//     }

//     const newPrefix = newFolder + "/";
//     const oldPrefix = oldFolder + "/";
//     // Check if target already exists
//     if (
//       Object.keys(currentProject.files).some((k) => k.startsWith(newPrefix))
//     ) {
//       setAlertMessage(`A folder named "${newFolder}" already exists.`);
//       return;
//     }

//     try {
//       const updatedFiles = {};
//       for (const [key, value] of Object.entries(currentProject.files)) {
//         if (key.startsWith(oldPrefix)) {
//           const newKey = newPrefix + key.slice(oldPrefix.length);
//           updatedFiles[newKey] = { ...value, name: newKey.split("/").pop() };
//         } else {
//           updatedFiles[key] = value;
//         }
//       }
//       const updatedProject = { ...currentProject, files: updatedFiles };
//       const nextActive = activeFile?.startsWith(oldPrefix)
//         ? newPrefix + activeFile.slice(oldPrefix.length)
//         : activeFile;

//       // Update expanded state
//       setExpandedFolders((prev) => {
//         const next = { ...prev };
//         delete next[oldFolder];
//         next[newFolder] = true;
//         return next;
//       });

//       updateProjectDetails({
//         currentProject: updatedProject,
//         activeFile: nextActive,
//         latexContent: updatedProject.files[nextActive]?.content || "",
//       });
//       await saveProject(
//         updatedProject,
//         nextActive,
//         compilationStatus,
//         compilationMessage,
//         isServerConnected,
//         isAuthenticated,
//       );
//       showToast(`Renamed to ${newFolder}`);
//     } catch (err) {
//       console.error("Folder rename failed:", err);
//       setAlertMessage("Failed to rename folder.");
//     }
//   };

//   const handleDeleteFolder = (e, folderName) => {
//     e.stopPropagation();
//     if (folderName === "Definitions") {
//       setAlertMessage("Cannot delete the Definitions folder.");
//       return;
//     }
//     const prefix = folderName + "/";
//     const filesInFolder = Object.keys(currentProject.files).filter((k) =>
//       k.startsWith(prefix),
//     );

//     setConfirmModal({
//       isOpen: true,
//       title: "Delete Folder",
//       message: `Delete folder "${folderName}" and all ${filesInFolder.length} file(s) inside?`,
//       onConfirm: async () => {
//         setConfirmModal({
//           isOpen: false,
//           title: "",
//           message: "",
//           onConfirm: null,
//         });
//         try {
//           const updatedFiles = { ...currentProject.files };
//           filesInFolder.forEach((f) => delete updatedFiles[f]);
//           const updatedProject = { ...currentProject, files: updatedFiles };

//           if (updatedProject.rootFile?.startsWith(prefix)) {
//             updatedProject.rootFile = null;
//           }

//           let nextActive = activeFile;
//           if (activeFile?.startsWith(prefix)) {
//             const texFiles = Object.keys(updatedProject.files).filter((f) =>
//               f.endsWith(".tex"),
//             );
//             nextActive = texFiles.length > 0 ? texFiles[0] : null;
//           }

//           updateProjectDetails({
//             currentProject: updatedProject,
//             activeFile: nextActive,
//             latexContent: nextActive
//               ? updatedProject.files[nextActive]?.content || ""
//               : "",
//           });
//           await saveProject(
//             updatedProject,
//             nextActive,
//             compilationStatus,
//             compilationMessage,
//             isServerConnected,
//             isAuthenticated,
//           );
//           showToast(`Deleted folder ${folderName}`);
//         } catch (err) {
//           console.error("Folder delete failed:", err);
//           setAlertMessage("Failed to delete folder.");
//         }
//       },
//     });
//   };

//   // ============ FILE TREE BUILDER ============

//   const buildFileTree = (files) => {
//     const folders = {}; // { folderName: [fileKey, ...] }
//     const rootFiles = [];

//     Object.keys(files)
//       .sort()
//       .forEach((key) => {
//         const slashIdx = key.indexOf("/");
//         if (slashIdx > 0) {
//           const folder = key.slice(0, slashIdx);
//           if (!folders[folder]) folders[folder] = [];
//           folders[folder].push(key);
//         } else {
//           rootFiles.push(key);
//         }
//       });

//     return { folders, rootFiles };
//   };

//   const fileTree = currentProject?.files
//     ? buildFileTree(currentProject.files)
//     : { folders: {}, rootFiles: [] };

//   const renderFileRow = (fileName, displayName, depth = 0) => {
//     const isImage = /\.(png|jpg|jpeg|gif|svg|pdf|eps)$/i.test(fileName);
//     const isTex = fileName.endsWith(".tex");
//     const indentClass = depth === 1 ? "ml-4" : "";

//     return (
//       <div
//         key={fileName}
//         onClick={() => handleFileClick(fileName)}
//         className={`${indentClass} px-3 py-1.5 text-[13px] cursor-pointer flex items-center gap-3 rounded-md border transition-all duration-200 group mb-0.5 relative ${
//           activeFile === fileName
//             ? isDark
//               ? "bg-[#333] border-[#555] text-white shadow-sm"
//               : "bg-white border-[#CFCFCF] text-black shadow-sm ring-1 ring-gray-100"
//             : isDark
//               ? "bg-transparent border-transparent text-[#a0a0a0] hover:bg-[#2d2d2d] hover:border-[#404040]"
//               : "bg-transparent border-transparent text-[#585858] hover:bg-white hover:border-[#CFCFCF] hover:shadow-sm"
//         }`}
//       >
//         {/* File Icon */}
//         <div
//           className={`p-1 rounded transition-colors ${
//             activeFile === fileName
//               ? isDark
//                 ? "bg-gray-400/20 text-gray-50"
//                 : "bg-gray-50 text-black"
//               : isDark
//                 ? "bg-[#333] text-[#777] group-hover:text-[#aaa]"
//                 : "bg-gray-100 text-[#888] group-hover:bg-gray-200 group-hover:text-[#555]"
//           }`}
//         >
//           {isTex ? (
//             <svg
//               className="w-3.5 h-3.5"
//               fill="none"
//               stroke="currentColor"
//               viewBox="0 0 24 24"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
//               />
//             </svg>
//           ) : isImage ? (
//             <svg
//               className="w-3.5 h-3.5"
//               fill="none"
//               stroke="currentColor"
//               viewBox="0 0 24 24"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
//               />
//             </svg>
//           ) : (
//             <svg
//               className="w-3.5 h-3.5"
//               fill="none"
//               stroke="currentColor"
//               viewBox="0 0 24 24"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
//               />
//             </svg>
//           )}
//         </div>

//         {renamingFile === fileName ? (
//           <input
//             ref={renameInputRef}
//             type="text"
//             value={renameValue}
//             onChange={(e) => setRenameValue(e.target.value)}
//             onBlur={() => handleRenameSubmit(fileName)}
//             onKeyDown={(e) => {
//               if (e.key === "Enter") handleRenameSubmit(fileName);
//               if (e.key === "Escape") setRenamingFile(null);
//             }}
//             onClick={(e) => e.stopPropagation()}
//             className={`flex-1 px-1 py-0 text-[13px] font-medium tracking-tight rounded border outline-none ${
//               isDark
//                 ? "bg-[#333] border-[#555] text-white focus:border-[#777]"
//                 : "bg-white border-[#CFCFCF] text-black focus:border-gray-500"
//             }`}
//             autoFocus
//           />
//         ) : (
//           <span className="truncate flex-1 font-medium tracking-tight">
//             {displayName}
//           </span>
//         )}

//         {/* Actions Area */}
//         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               if (menuState?.fileName === fileName) {
//                 setMenuState(null);
//               } else {
//                 const rect = e.currentTarget.getBoundingClientRect();
//                 setMenuState({
//                   fileName,
//                   x: rect.right + 8,
//                   y: rect.top,
//                 });
//               }
//             }}
//             className={`p-1 rounded transition-colors ${isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-500"}`}
//             title="Options"
//           >
//             <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
//               <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
//             </svg>
//           </button>
//         </div>

//         {/* Floating Menu Portal-like */}
//         {menuState?.fileName === fileName && (
//           <div
//             className={`fixed w-36 rounded shadow-xl border z-[99999] text-[13px] overflow-hidden ${isDark ? "bg-[#333] border-[#444]" : "bg-white border-gray-200"}`}
//             style={{ left: menuState.x, top: menuState.y }}
//             onClick={(e) => e.stopPropagation()}
//           >
//             {isTex && (
//               <button
//                 onClick={(e) => handleSetMainFile(e, fileName)}
//                 className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
//                   currentProject?.rootFile === fileName
//                     ? isDark
//                       ? "text-blue-400 bg-[#444] font-medium"
//                       : "text-blue-600 bg-blue-50 font-medium"
//                     : isDark
//                       ? "text-gray-200 hover:bg-[#444]"
//                       : "text-gray-700 hover:bg-gray-100"
//                 }`}
//               >
//                 <svg
//                   className="w-3.5 h-3.5"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M5 13l4 4L19 7"
//                   />
//                 </svg>
//                 Set as root file
//               </button>
//             )}
//             <button
//               onClick={(e) => {
//                 setMenuState(null);
//                 handleRenameStart(e, fileName);
//               }}
//               className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${isDark ? "text-gray-200 hover:bg-[#444]" : "text-gray-700 hover:bg-gray-100"}`}
//             >
//               <svg
//                 className="w-3.5 h-3.5"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
//                 />
//               </svg>
//               Rename
//             </button>
//             <button
//               onClick={(e) => {
//                 setMenuState(null);
//                 handleDeleteFile(e, fileName);
//               }}
//               className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 text-red-500 ${isDark ? "hover:bg-[#444]" : "hover:bg-red-50"}`}
//             >
//               <svg
//                 className="w-3.5 h-3.5"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
//                 />
//               </svg>
//               Delete
//             </button>
//           </div>
//         )}

//         {/* Active Indicator Dot */}
//         {activeFile === fileName && (
//           <div
//             className={`w-2 h-2 rounded-full ${isDark ? "bg-white" : "bg-gray-700"} shadow-[0_0_8px_rgba(59,130,246,0.5)]`}
//           ></div>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div
//       className={`fixed top-7 left-10 h-[calc(100vh-2.75rem)] border-r transition-colors duration-300 z-30 ${
//         isDark
//           ? "bg-[#252525] border-[#404040] text-[#e5e5e5]"
//           : "bg-[#F9F9F9] border-[#CFCFCF] text-[#585858]"
//       }`}
//       style={{ width: width }}
//     >
//       {/* Resize drag handle on right edge */}
//       {onDragStart && (
//         <div
//           onMouseDown={onDragStart}
//           className="absolute top-0 -right-2 w-4 h-full cursor-col-resize z-[100] group flex justify-center"
//         >
//           <div className="w-1 h-full group-hover:bg-gray-400 group-hover:opacity-40 transition-opacity" />
//         </div>
//       )}
//       <div className="flex flex-col h-full">
//         {/* Header */}
//         <div
//           className={`flex items-center justify-between p-4 border-b ${isDark ? "border-[#404040]" : "border-[#CFCFCF]"}`}
//         >
//           <span className="font-medium text-black font-inter text-sm">
//             Project Files
//           </span>
//           <div className="space-x-3">
//             <button
//               onClick={() => setIsCreatingFile(true)}
//               className={`p-1 rounded hover:bg-opacity-20 ${isDark ? "hover:bg-white" : "hover:bg-black"}`}
//               title="New File"
//             >
//               <AddFileIcon
//                 style={{ fill: "#9BC59D" }}
//                 className="w-[14px] h-[14px]"
//               />
//             </button>
//             <button
//               onClick={() => setIsCreatingFolder(true)}
//               className={`p-1 rounded hover:bg-opacity-20 ${isDark ? "hover:bg-white" : "hover:bg-black"}`}
//               title="New Folder"
//             >
//               <AddFolderIcon
//                 style={{ fill: "#9BC59D" }}
//                 className="w-[14px] h-[14px]"
//               />
//             </button>
//             <button
//               onClick={() => fileInputRef.current?.click()}
//               disabled={isUploading}
//               className={`p-1 rounded hover:bg-opacity-20 ${isDark ? "hover:bg-white" : "hover:bg-black"} ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
//               title="Upload File"
//             >
//               {isUploading ? (
//                 <svg
//                   className="w-4 h-4 animate-spin"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                 >
//                   <circle
//                     cx="12"
//                     cy="12"
//                     r="10"
//                     stroke="#9BC59D"
//                     strokeWidth="2"
//                     opacity="0.3"
//                   />
//                   <path
//                     d="M12 2a10 10 0 0 1 10 10"
//                     stroke="#9BC59D"
//                     strokeWidth="2"
//                   />
//                 </svg>
//               ) : (
//                 <UploadFileIcon
//                   style={{ fill: "#0a0a0a" }}
//                   className="w-4 h-4"
//                 />
//               )}
//             </button>
//             {/* Hidden file input for uploads */}
//             <input
//               ref={fileInputRef}
//               type="file"
//               multiple
//               accept=".png,.jpg,.jpeg,.pdf,.eps,.svg,.tex,.bib,.sty,.cls"
//               onChange={handleFileUpload}
//               className="hidden"
//             />
//           </div>
//         </div>

//         {/* New File Input */}
//         {isCreatingFile && (
//           <div className="p-3">
//             <form onSubmit={handleAddFile} className="flex flex-col gap-2">
//               <input
//                 autoFocus
//                 type="text"
//                 value={newFileName}
//                 onChange={(e) => setNewFileName(e.target.value)}
//                 placeholder="filename.tex"
//                 className={`w-full px-2 py-1 text-sm rounded border focus:outline-none ${
//                   isDark
//                     ? "bg-[#333] border-[#555] text-white focus:border-[#777]"
//                     : "bg-white border-gray-300 text-black focus:border-gray-500"
//                 }`}
//               />
//               {error && <span className="text-xs text-red-500">{error}</span>}
//               <div className="flex justify-end gap-2">
//                 <button
//                   type="button"
//                   onClick={() => setIsCreatingFile(false)}
//                   className="text-xs px-2 py-1 opacity-70 hover:opacity-100"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className={`text-xs px-2 py-1 rounded ${isDark ? "bg-[#404040] hover:bg-[#505050]" : "bg-gray-200 hover:bg-gray-300"}`}
//                 >
//                   Create
//                 </button>
//               </div>
//             </form>
//           </div>
//         )}

//         {/* New Folder Input */}
//         {isCreatingFolder && (
//           <div className="p-3">
//             <form onSubmit={handleAddFolder} className="flex flex-col gap-2">
//               <input
//                 autoFocus
//                 type="text"
//                 value={newFolderName}
//                 onChange={(e) => setNewFolderName(e.target.value)}
//                 placeholder="Folder name"
//                 className={`w-full px-2 py-1 text-sm rounded border focus:outline-none ${
//                   isDark
//                     ? "bg-[#333] border-[#555] text-white focus:border-[#777]"
//                     : "bg-white border-gray-300 text-black focus:border-gray-500"
//                 }`}
//               />
//               {error && <span className="text-xs text-red-500">{error}</span>}
//               <div className="flex justify-end gap-2">
//                 <button
//                   type="button"
//                   onClick={() => setIsCreatingFolder(false)}
//                   className="text-xs px-2 py-1 opacity-70 hover:opacity-100"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className={`text-xs px-2 py-1 rounded ${isDark ? "bg-[#404040] hover:bg-[#505050]" : "bg-gray-200 hover:bg-gray-300"}`}
//                 >
//                   Create
//                 </button>
//               </div>
//             </form>
//           </div>
//         )}

//         {/* File Tree */}
//         <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
//           {/* Folders */}
//           {Object.keys(fileTree.folders)
//             .sort()
//             .map((folderName) => (
//               <div key={folderName} className="mb-1">
//                 <div
//                   className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer group hover:bg-opacity-50 ${
//                     isDark
//                       ? "hover:bg-[#333] text-gray-300"
//                       : "hover:bg-gray-100 text-gray-700"
//                   }`}
//                   onClick={() => handleFolderToggle(folderName)}
//                 >
//                   <div
//                     className={`transition-transform duration-200 ${expandedFolders[folderName] ? "rotate-90" : ""}`}
//                   >
//                     <svg
//                       className="w-3 h-3"
//                       fill="none"
//                       stroke="currentColor"
//                       viewBox="0 0 24 24"
//                     >
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth={2}
//                         d="M9 5l7 7-7 7"
//                       />
//                     </svg>
//                   </div>

//                   <svg
//                     className="w-4 h-4 text-[#9BC59D]"
//                     fill="none"
//                     stroke="currentColor"
//                     viewBox="0 0 24 24"
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
//                     />
//                   </svg>

//                   {renamingFolder === folderName ? (
//                     <input
//                       ref={renameFolderInputRef}
//                       type="text"
//                       value={renameFolderValue}
//                       onChange={(e) => setRenameFolderValue(e.target.value)}
//                       onBlur={() => handleFolderRenameSubmit(folderName)}
//                       onKeyDown={(e) => {
//                         if (e.key === "Enter")
//                           handleFolderRenameSubmit(folderName);
//                         if (e.key === "Escape") setRenamingFolder(null);
//                       }}
//                       onClick={(e) => e.stopPropagation()}
//                       className={`flex-1 px-1 py-0 text-[13px] font-medium tracking-tight rounded border outline-none ${
//                         isDark
//                           ? "bg-[#333] border-[#555] text-white focus:border-[#777]"
//                           : "bg-white border-[#CFCFCF] text-black focus:border-gray-500"
//                       }`}
//                       autoFocus
//                     />
//                   ) : (
//                     <span className="text-[13px] font-medium truncate flex-1 select-none">
//                       {folderName}
//                     </span>
//                   )}

//                   {/* Folder Actions */}
//                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                     {folderName !== "Definitions" && (
//                       <>
//                         <button
//                           onClick={(e) =>
//                             handleFolderRenameStart(e, folderName)
//                           }
//                           className={`p-1 rounded hover:bg-blue-500/10 hover:text-blue-500 transition-colors ${isDark ? "text-gray-500" : "text-gray-400"}`}
//                           title="Rename Folder"
//                         >
//                           <svg
//                             className="w-3.5 h-3.5"
//                             fill="none"
//                             stroke="currentColor"
//                             viewBox="0 0 24 24"
//                           >
//                             <path
//                               strokeLinecap="round"
//                               strokeLinejoin="round"
//                               strokeWidth={2}
//                               d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
//                             />
//                           </svg>
//                         </button>
//                         <button
//                           onClick={(e) => handleDeleteFolder(e, folderName)}
//                           className={`p-1 rounded hover:bg-red-500/10 hover:text-red-500 transition-colors ${isDark ? "text-gray-500" : "text-gray-400"}`}
//                           title="Delete Folder"
//                         >
//                           <svg
//                             className="w-3.5 h-3.5"
//                             fill="none"
//                             stroke="currentColor"
//                             viewBox="0 0 24 24"
//                           >
//                             <path
//                               strokeLinecap="round"
//                               strokeLinejoin="round"
//                               strokeWidth={2}
//                               d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
//                             />
//                           </svg>
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 </div>

//                 {/* Folder Content */}
//                 {expandedFolders[folderName] && (
//                   <div className="ml-4 pl-2 border-l border-gray-200/20 space-y-0.5 mt-0.5">
//                     {fileTree.folders[folderName].sort().map((fileName) => {
//                       if (fileName.endsWith("/.gitkeep")) return null; // Skip gitkeep
//                       return renderFileRow(
//                         fileName,
//                         fileName.split("/").pop(),
//                         1,
//                       );
//                     })}
//                   </div>
//                 )}
//               </div>
//             ))}

//           {/* Root Files */}
//           {fileTree.rootFiles
//             .sort()
//             .map((fileName) => renderFileRow(fileName, fileName))}

//           {Object.keys(fileTree.folders).length === 0 &&
//             fileTree.rootFiles.length === 0 && (
//               <div className="p-4 text-xs opacity-50 text-center">
//                 No files in project
//               </div>
//             )}
//         </div>
//       </div>

//       <Toast message={toast} isVisible={!!toast} />
//       <AlertModal
//         isOpen={!!alertMessage}
//         message={alertMessage}
//         onClose={() => setAlertMessage(null)}
//       />
//       <ConfirmModal
//         isOpen={confirmModal.isOpen}
//         title={confirmModal.title}
//         message={confirmModal.message}
//         onConfirm={confirmModal.onConfirm}
//         onCancel={() =>
//           setConfirmModal({
//             isOpen: false,
//             title: "",
//             message: "",
//             onConfirm: null,
//           })
//         }
//       />
//     </div>
//   );
// };

// export default SectionSpace;
import React, {
  useContext,
  useState,
  useRef as useReactRef,
  useEffect,
} from "react";
import { projectContext } from "../context/useProject";
import { useSettings } from "../context/useSettings";
import { saveProject } from "../api/projectHandling";
import { useAuth } from "../context/useAuth";
import AddFileIcon from "../assets/icons/addFile.svg?react";
import AddFolderIcon from "../assets/icons/addFolder.svg?react";
import UploadFileIcon from "../assets/icons/upload.svg?react";
import axios from "axios";
import {
  TbAlertTriangle,
  TbCheck,
  TbX,
  TbDotsVertical,
  TbTrash,
} from "react-icons/tb";
import LinearLoading from "./loading/linearLoading";

// Confirmation Modal Component
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <TbAlertTriangle className="text-amber-500" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-medium"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// Alert Modal Component
const AlertModal = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <TbAlertTriangle className="text-amber-500" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">Notice</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-medium"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Component
const Toast = ({ message, isVisible }) => {
  if (!isVisible) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
      <TbCheck size={16} className="text-green-400" />
      <span className="text-sm">{message}</span>
    </div>
  );
};

const SectionSpace = ({ width = 256, onDragStart }) => {
  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const { currentProject, activeFile, compilationStatus, compilationMessage } =
    projectDetails;
  const { settings } = useSettings();
  const { user, isServerConnected, isAuthenticated } = useAuth();

  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [renamingFile, setRenamingFile] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useReactRef(null);

  // Folder state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState({});
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const renameFolderInputRef = useReactRef(null);
  const [folderMenuState, setFolderMenuState] = useState(null);
  const [creatingFileInFolder, setCreatingFileInFolder] = useState(null);

  // Multi-select and Bulk Action State
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteMessage, setBulkDeleteMessage] = useState("");

  const fileInputRef = useReactRef(null);
  const targetUploadFolderRef = useReactRef(null);

  const isDark = settings.appearance.mode === "dark";

  const [menuState, setMenuState] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => {
      setMenuState(null);
      setFolderMenuState(null);
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("scroll", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("scroll", handleClickOutside, true);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && selectedFiles.size > 0) {
        setSelectedFiles(new Set());
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedFiles]);

  const handleSetMainFile = async (e, fileName) => {
    e.stopPropagation();
    setMenuState(null);

    const updatedProject = {
      ...currentProject,
      rootFile: fileName,
    };

    updateProjectDetails({
      currentProject: updatedProject,
    });

    await saveProject(
      updatedProject,
      activeFile,
      compilationStatus,
      compilationMessage,
      isServerConnected,
      isAuthenticated,
    );
    showToast(`Set "${fileName}" as the main root file`);
  };

  const handleFileClick = (e, fileName) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setSelectedFiles((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(fileName)) {
          newSet.delete(fileName);
        } else {
          newSet.add(fileName);
        }
        return newSet;
      });
    } else {
      if (selectedFiles.size > 0) {
        setSelectedFiles(new Set());
      }
      updateProjectDetails({
        activeFile: fileName,
        latexContent: currentProject.files[fileName]?.content || "",
      });
    }
  };

  const executeAddFile = async (fileName, targetFolder = null) => {
    if (!currentProject || !fileName.trim()) return false;

    try {
      let finalName = fileName.trim();
      if (!finalName.includes(".")) {
        finalName += ".tex";
      }

      const fullPath = targetFolder
        ? `${targetFolder}/${finalName}`
        : finalName;

      if (currentProject.files[fullPath]) {
        setError("File already exists");
        return false;
      }

      const newFile = {
        name: fullPath,
        content: "",
        type: fullPath.split(".").pop(),
      };

      const updatedProject = {
        ...currentProject,
        files: {
          ...currentProject.files,
          [fullPath]: newFile,
        },
      };

      if (targetFolder) {
        setExpandedFolders((prev) => ({ ...prev, [targetFolder]: true }));
      }

      updateProjectDetails({
        currentProject: updatedProject,
        activeFile: fullPath,
        latexContent: "",
      });

      await saveProject(
        updatedProject,
        fullPath,
        compilationStatus,
        compilationMessage,
        isServerConnected,
        isAuthenticated,
      );

      return true;
    } catch (err) {
      console.error("Failed to add file:", err);
      setError("Failed to create file on server");
      return false;
    }
  };

  const handleAddFile = async (e) => {
    e.preventDefault();
    setError("");
    const success = await executeAddFile(newFileName, null);
    if (success) {
      setIsCreatingFile(false);
      setNewFileName("");
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const handleDeleteFile = async (e, fileName) => {
    e.stopPropagation();

    setConfirmModal({
      isOpen: true,
      title: "Delete File",
      message: `Are you sure you want to delete ${fileName.split("/").pop()}?`,
      onConfirm: async () => {
        setConfirmModal({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        });
        try {
          const response = await axios.delete(
            `http://localhost:5000/api/projects/${
              currentProject.id
            }/files/${encodeURIComponent(fileName)}`,
          );

          if (response.data.success) {
            let updatedProject = response.data.project;
            let needsSave = false;

            if (updatedProject.rootFile === fileName) {
              updatedProject.rootFile = null;
              needsSave = true;
            }

            let nextActiveFile = activeFile;
            if (activeFile === fileName) {
              const texFiles = Object.keys(updatedProject.files).filter((f) =>
                f.endsWith(".tex"),
              );
              nextActiveFile = texFiles.length > 0 ? texFiles[0] : null;
            }

            updateProjectDetails({
              currentProject: updatedProject,
              activeFile: nextActiveFile,
              latexContent: nextActiveFile
                ? updatedProject.files[nextActiveFile]?.content || ""
                : "",
            });

            if (needsSave) {
              await saveProject(
                updatedProject,
                nextActiveFile,
                compilationStatus,
                compilationMessage,
                isServerConnected,
                isAuthenticated,
              );
            }

            setSelectedFiles((prev) => {
              const newSet = new Set(prev);
              newSet.delete(fileName);
              return newSet;
            });

            showToast(`Deleted file`);
          }
        } catch (err) {
          console.error("Delete failed:", err);
          setError("Failed to delete file");
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedFiles.size === 0) return;

    setConfirmModal({
      isOpen: true,
      title: "Delete Multiple Files",
      message: `Are you sure you want to delete the ${selectedFiles.size} selected file(s)?`,
      onConfirm: async () => {
        setConfirmModal({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        });

        setIsBulkDeleting(true);
        setBulkDeleteMessage(
          `Preparing to delete ${selectedFiles.size} files...`,
        );

        try {
          let count = 0;
          for (const fileName of selectedFiles) {
            count++;
            setBulkDeleteMessage(
              `Deleting ${count} of ${selectedFiles.size} files...`,
            );
            await axios.delete(
              `http://localhost:5000/api/projects/${
                currentProject.id
              }/files/${encodeURIComponent(fileName)}`,
            );
          }

          setBulkDeleteMessage("Updating workspace...");

          let updatedFiles = { ...currentProject.files };
          selectedFiles.forEach((file) => delete updatedFiles[file]);

          let updatedProject = { ...currentProject, files: updatedFiles };
          let needsSave = false;

          if (selectedFiles.has(updatedProject.rootFile)) {
            updatedProject.rootFile = null;
            needsSave = true;
          }

          let nextActiveFile = activeFile;
          if (selectedFiles.has(activeFile)) {
            const texFiles = Object.keys(updatedProject.files).filter((f) =>
              f.endsWith(".tex"),
            );
            nextActiveFile = texFiles.length > 0 ? texFiles[0] : null;
          }

          updateProjectDetails({
            currentProject: updatedProject,
            activeFile: nextActiveFile,
            latexContent: nextActiveFile
              ? updatedProject.files[nextActiveFile]?.content || ""
              : "",
          });

          if (needsSave) {
            await saveProject(
              updatedProject,
              nextActiveFile,
              compilationStatus,
              compilationMessage,
              isServerConnected,
              isAuthenticated,
            );
          }

          showToast(`Deleted ${selectedFiles.size} file(s)`);
          setSelectedFiles(new Set());
        } catch (err) {
          console.error("Bulk delete failed:", err);
          setAlertMessage(
            "An error occurred while deleting. Some files may still remain.",
          );
          setSelectedFiles(new Set());
        } finally {
          setIsBulkDeleting(false);
        }
      },
    });
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentProject) return;

    setIsUploading(true);
    setError("");

    try {
      const newFiles = { ...currentProject.files };
      const filesToProcess = Array.from(files);
      let skippedCount = 0;

      const targetFolder = targetUploadFolderRef.current;

      for (const file of filesToProcess) {
        let fileName = file.name;
        if (targetFolder) {
          fileName = `${targetFolder}/${fileName}`;
        }

        const isImage = /\.(png|jpg|jpeg|gif|svg|pdf|eps)$/i.test(fileName);
        const isText = /\.(tex|bib|sty|cls|txt)$/i.test(fileName);

        if (isImage) {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          newFiles[fileName] = {
            name: fileName.split("/").pop(),
            content: dataUrl,
            type: fileName.split(".").pop(),
            isImage: true,
          };
        } else if (isText) {
          const content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
          });

          newFiles[fileName] = {
            name: fileName.split("/").pop(),
            content: content,
            type: fileName.split(".").pop(),
          };
        } else {
          console.warn(`Skipping unsupported file type: ${fileName}`);
          skippedCount++;
          continue;
        }
      }

      if (targetFolder) {
        setExpandedFolders((prev) => ({ ...prev, [targetFolder]: true }));
      }

      const updatedProject = { ...currentProject, files: newFiles };

      updateProjectDetails({ currentProject: updatedProject });

      await saveProject(
        updatedProject,
        activeFile,
        compilationStatus,
        compilationMessage,
        isServerConnected,
        isAuthenticated,
      );

      const uploadedCount = filesToProcess.length - skippedCount;
      if (uploadedCount > 0) {
        showToast(
          `Uploaded ${uploadedCount} file${uploadedCount > 1 ? "s" : ""}`,
        );
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to upload file: " + err.message);
    } finally {
      setIsUploading(false);
      targetUploadFolderRef.current = null;
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRenameStart = (e, fileName) => {
    e.stopPropagation();
    setRenamingFile(fileName);
    setRenameValue(fileName.split("/").pop());
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const handleRenameSubmit = async (oldName) => {
    const newBaseName = renameValue.trim();
    setRenamingFile(null);

    const oldBaseName = oldName.split("/").pop();
    if (!newBaseName || newBaseName === oldBaseName) return;

    const pathParts = oldName.split("/");
    pathParts.pop();
    const newName =
      pathParts.length > 0
        ? `${pathParts.join("/")}/${newBaseName}`
        : newBaseName;

    if (currentProject.files[newName]) {
      setAlertMessage(`A file named "${newBaseName}" already exists.`);
      return;
    }

    try {
      const updatedFiles = {};
      for (const [key, value] of Object.entries(currentProject.files)) {
        if (key === oldName) {
          updatedFiles[newName] = {
            ...value,
            name: newBaseName,
            type: newName.split(".").pop(),
          };
        } else {
          updatedFiles[key] = value;
        }
      }

      const updatedProject = { ...currentProject, files: updatedFiles };

      if (updatedProject.rootFile === oldName) {
        updatedProject.rootFile = newName;
      }

      const nextActive = activeFile === oldName ? newName : activeFile;

      updateProjectDetails({
        currentProject: updatedProject,
        activeFile: nextActive,
        latexContent: nextActive
          ? updatedProject.files[nextActive]?.content || ""
          : "",
      });

      await saveProject(
        updatedProject,
        nextActive,
        compilationStatus,
        compilationMessage,
        isServerConnected,
        isAuthenticated,
      );

      showToast(`Renamed to ${newBaseName}`);
    } catch (err) {
      console.error("Rename failed:", err);
      setAlertMessage("Failed to rename file.");
    }
  };

  // ============ FOLDER HANDLERS ============

  const handleAddFolder = (e) => {
    e.preventDefault();
    setError("");
    if (!currentProject) return;
    const name = newFolderName.trim();
    if (!name) {
      setError("Folder name cannot be empty");
      return;
    }
    if (name.includes("/") || name.includes("\\")) {
      setError("Folder name cannot contain slashes");
      return;
    }

    const folderPrefix = name + "/";
    const exists = Object.keys(currentProject.files).some((k) =>
      k.startsWith(folderPrefix),
    );
    if (exists) {
      setError("Folder already exists");
      return;
    }

    const placeholderKey = `${name}/.gitkeep`;
    const updatedProject = {
      ...currentProject,
      files: {
        ...currentProject.files,
        [placeholderKey]: { name: ".gitkeep", content: "", type: "gitkeep" },
      },
    };

    updateProjectDetails({ currentProject: updatedProject });
    setExpandedFolders((prev) => ({ ...prev, [name]: true }));
    saveProject(
      updatedProject,
      activeFile,
      compilationStatus,
      compilationMessage,
      isServerConnected,
      isAuthenticated,
    );
    setIsCreatingFolder(false);
    setNewFolderName("");
    showToast(`Created folder ${name}`);
  };

  const handleFolderToggle = (folderName) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const handleFolderRenameStart = (folderName) => {
    setRenamingFolder(folderName);
    setRenameFolderValue(folderName);
    setTimeout(() => renameFolderInputRef.current?.select(), 50);
  };

  const handleFolderRenameSubmit = async (oldFolder) => {
    const newFolder = renameFolderValue.trim();
    setRenamingFolder(null);
    if (!newFolder || newFolder === oldFolder) return;
    if (newFolder.includes("/") || newFolder.includes("\\")) {
      setAlertMessage("Folder name cannot contain slashes.");
      return;
    }

    const newPrefix = newFolder + "/";
    const oldPrefix = oldFolder + "/";
    if (
      Object.keys(currentProject.files).some((k) => k.startsWith(newPrefix))
    ) {
      setAlertMessage(`A folder named "${newFolder}" already exists.`);
      return;
    }

    try {
      const updatedFiles = {};
      for (const [key, value] of Object.entries(currentProject.files)) {
        if (key.startsWith(oldPrefix)) {
          const newKey = newPrefix + key.slice(oldPrefix.length);
          updatedFiles[newKey] = { ...value, name: newKey.split("/").pop() };
        } else {
          updatedFiles[key] = value;
        }
      }
      const updatedProject = { ...currentProject, files: updatedFiles };
      const nextActive = activeFile?.startsWith(oldPrefix)
        ? newPrefix + activeFile.slice(oldPrefix.length)
        : activeFile;

      setExpandedFolders((prev) => {
        const next = { ...prev };
        delete next[oldFolder];
        next[newFolder] = true;
        return next;
      });

      updateProjectDetails({
        currentProject: updatedProject,
        activeFile: nextActive,
        latexContent: updatedProject.files[nextActive]?.content || "",
      });
      await saveProject(
        updatedProject,
        nextActive,
        compilationStatus,
        compilationMessage,
        isServerConnected,
        isAuthenticated,
      );
      showToast(`Renamed folder`);
    } catch (err) {
      console.error("Folder rename failed:", err);
      setAlertMessage("Failed to rename folder.");
    }
  };

  const handleDeleteFolder = (folderName) => {
    if (folderName === "Definitions") {
      setAlertMessage("Cannot delete the Definitions folder.");
      return;
    }
    const prefix = folderName + "/";
    const filesInFolder = Object.keys(currentProject.files).filter((k) =>
      k.startsWith(prefix),
    );

    // Calculate visible files (ignore internal .gitkeep)
    const visibleFilesCount = filesInFolder.filter(
      (f) => !f.endsWith("/.gitkeep"),
    ).length;

    const message =
      visibleFilesCount === 0
        ? `Are you sure you want to delete the empty folder "${folderName}"?`
        : `Delete folder "${folderName}" and all ${visibleFilesCount} file(s) inside?`;

    setConfirmModal({
      isOpen: true,
      title: "Delete Folder",
      message: message,
      onConfirm: async () => {
        setConfirmModal({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        });
        try {
          const updatedFiles = { ...currentProject.files };
          filesInFolder.forEach((f) => delete updatedFiles[f]);
          const updatedProject = { ...currentProject, files: updatedFiles };

          if (updatedProject.rootFile?.startsWith(prefix)) {
            updatedProject.rootFile = null;
          }

          let nextActive = activeFile;
          if (activeFile?.startsWith(prefix)) {
            const texFiles = Object.keys(updatedProject.files).filter((f) =>
              f.endsWith(".tex"),
            );
            nextActive = texFiles.length > 0 ? texFiles[0] : null;
          }

          updateProjectDetails({
            currentProject: updatedProject,
            activeFile: nextActive,
            latexContent: nextActive
              ? updatedProject.files[nextActive]?.content || ""
              : "",
          });
          await saveProject(
            updatedProject,
            nextActive,
            compilationStatus,
            compilationMessage,
            isServerConnected,
            isAuthenticated,
          );
          showToast(`Deleted folder ${folderName}`);
        } catch (err) {
          console.error("Folder delete failed:", err);
          setAlertMessage("Failed to delete folder.");
        }
      },
    });
  };

  // ============ FILE TREE BUILDER ============

  const buildFileTree = (files) => {
    const folders = {};
    const rootFiles = [];

    Object.keys(files)
      .sort()
      .forEach((key) => {
        const slashIdx = key.indexOf("/");
        if (slashIdx > 0) {
          const folder = key.slice(0, slashIdx);
          if (!folders[folder]) folders[folder] = [];
          folders[folder].push(key);
        } else {
          rootFiles.push(key);
        }
      });

    return { folders, rootFiles };
  };

  const fileTree = currentProject?.files
    ? buildFileTree(currentProject.files)
    : { folders: {}, rootFiles: [] };

  const renderFileRow = (fileName, displayName, depth = 0) => {
    const isImage = /\.(png|jpg|jpeg|gif|svg|pdf|eps)$/i.test(fileName);
    const isTex = fileName.endsWith(".tex");
    const indentClass = depth === 1 ? "ml-4" : "";

    const isSelected = selectedFiles.has(fileName);

    let baseBgClass = "";
    if (activeFile === fileName) {
      baseBgClass = isDark
        ? "bg-[#333] border-[#555] text-white shadow-sm"
        : "bg-white border-[#CFCFCF] text-black shadow-sm ring-1 ring-gray-100";
    } else {
      baseBgClass = isDark
        ? "bg-transparent border-transparent text-[#a0a0a0] hover:bg-[#2d2d2d] hover:border-[#404040]"
        : "bg-transparent border-transparent text-[#585858] hover:bg-white hover:border-[#CFCFCF] hover:shadow-sm";
    }

    const selectedStyle = isSelected
      ? isDark
        ? " outline outline-1 outline-dashed outline-gray-400 !bg-gray-600/30"
        : " outline outline-1 outline-dashed outline-gray-400 !bg-gray-200/60"
      : "";

    return (
      <div
        key={fileName}
        onClick={(e) => handleFileClick(e, fileName)}
        className={`${indentClass} px-3 py-1.5 text-[13px] cursor-pointer flex items-center gap-3 rounded-md border transition-all duration-200 group mb-0.5 relative ${baseBgClass} ${selectedStyle}`}
      >
        <div
          className={`p-1 rounded transition-colors ${
            activeFile === fileName
              ? isDark
                ? "bg-gray-400/20 text-gray-50"
                : "bg-gray-50 text-black"
              : isDark
              ? "bg-[#333] text-[#777] group-hover:text-[#aaa]"
              : "bg-gray-100 text-[#888] group-hover:bg-gray-200 group-hover:text-[#555]"
          }`}
        >
          {isTex ? (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ) : isImage ? (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          ) : (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>

        {renamingFile === fileName ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => handleRenameSubmit(fileName)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit(fileName);
              if (e.key === "Escape") setRenamingFile(null);
            }}
            onClick={(e) => e.stopPropagation()}
            className={`flex-1 px-1 py-0 text-[13px] font-medium tracking-tight rounded border outline-none ${
              isDark
                ? "bg-[#333] border-[#555] text-white focus:border-[#777]"
                : "bg-white border-[#CFCFCF] text-black focus:border-gray-500"
            }`}
            autoFocus
          />
        ) : (
          <span className="truncate flex-1 font-medium tracking-tight">
            {displayName}
          </span>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (menuState?.fileName === fileName) {
                setMenuState(null);
              } else {
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuState({ fileName, x: rect.right + 8, y: rect.top });
              }
            }}
            className={`p-1 rounded transition-colors ${
              isDark
                ? "hover:bg-gray-700 text-gray-400"
                : "hover:bg-gray-200 text-gray-500"
            }`}
          >
            <TbDotsVertical size={16} />
          </button>
        </div>

        {menuState?.fileName === fileName && (
          <div
            className={`fixed w-36 rounded shadow-xl border z-[99999] text-[13px] overflow-hidden ${
              isDark ? "bg-[#333] border-[#444]" : "bg-white border-gray-200"
            }`}
            style={{ left: menuState.x, top: menuState.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {isTex && (
              <button
                onClick={(e) => handleSetMainFile(e, fileName)}
                className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                  currentProject?.rootFile === fileName
                    ? isDark
                      ? "text-blue-400 bg-[#444] font-medium"
                      : "text-blue-600 bg-blue-50 font-medium"
                    : isDark
                    ? "text-gray-200 hover:bg-[#444]"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Set as root file
              </button>
            )}

            {/* NEW: Copy Relative Path Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuState(null);
                navigator.clipboard.writeText(fileName);
                showToast("Copied relative path!");
              }}
              className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                isDark
                  ? "text-gray-200 hover:bg-[#444]"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Copy Relative Path
            </button>

            <button
              onClick={(e) => {
                setMenuState(null);
                handleRenameStart(e, fileName);
              }}
              className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                isDark
                  ? "text-gray-200 hover:bg-[#444]"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Rename
            </button>
            <button
              onClick={(e) => {
                setMenuState(null);
                handleDeleteFile(e, fileName);
              }}
              className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 text-red-500 ${
                isDark ? "hover:bg-[#444]" : "hover:bg-red-50"
              }`}
            >
              Delete
            </button>
          </div>
        )}

        {activeFile === fileName && (
          <div
            className={`w-2 h-2 rounded-full ${
              isDark ? "bg-white" : "bg-gray-700"
            } shadow-[0_0_8px_rgba(59,130,246,0.5)]`}
          ></div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`fixed top-7 left-10 h-[calc(100vh-2.75rem)] border-r transition-colors duration-300 z-30 ${
        isDark
          ? "bg-[#252525] border-[#404040] text-[#e5e5e5]"
          : "bg-[#F9F9F9] border-[#CFCFCF] text-[#585858]"
      }`}
      style={{ width: width }}
    >
      {onDragStart && (
        <div
          onMouseDown={onDragStart}
          className="absolute top-0 -right-2 w-4 h-full cursor-col-resize z-[100] group flex justify-center"
        >
          <div className="w-1 h-full group-hover:bg-gray-400 group-hover:opacity-40 transition-opacity" />
        </div>
      )}

      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDark ? "border-[#404040]" : "border-[#CFCFCF]"
          }`}
        >
          <span className="font-medium text-black font-inter text-sm truncate">
            Project Files
          </span>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setIsCreatingFile(true)}
              className={`p-1 rounded hover:bg-opacity-20 ${
                isDark ? "hover:bg-white" : "hover:bg-black"
              }`}
              title="New File"
            >
              <AddFileIcon
                style={{ fill: "#9BC59D" }}
                className="w-[14px] h-[14px]"
              />
            </button>
            <button
              onClick={() => setIsCreatingFolder(true)}
              className={`p-1 rounded hover:bg-opacity-20 ${
                isDark ? "hover:bg-white" : "hover:bg-black"
              }`}
              title="New Folder"
            >
              <AddFolderIcon
                style={{ fill: "#9BC59D" }}
                className="w-[14px] h-[14px]"
              />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`p-1 rounded hover:bg-opacity-20 ${
                isDark ? "hover:bg-white" : "hover:bg-black"
              } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Upload File"
            >
              {isUploading ? (
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#9BC59D"
                    strokeWidth="2"
                    opacity="0.3"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="#9BC59D"
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                <UploadFileIcon
                  style={{ fill: "#0a0a0a" }}
                  className="w-4 h-4"
                />
              )}
            </button>

            <div
              className={`h-4 w-[1px] mx-1 ${
                isDark ? "bg-gray-700" : "bg-gray-300"
              }`}
            ></div>

            {/* Bulk Delete Button */}
            <button
              onClick={handleBulkDelete}
              disabled={selectedFiles.size === 0}
              className={`p-1 rounded transition-colors ${
                selectedFiles.size > 0
                  ? "text-red-500 hover:bg-red-50"
                  : "text-gray-400 opacity-50 cursor-not-allowed"
              } ${
                isDark && selectedFiles.size > 0 ? "hover:bg-red-500/10" : ""
              }`}
              title={
                selectedFiles.size > 0
                  ? `Delete ${selectedFiles.size} selected files`
                  : "Delete Selected Files"
              }
            >
              <TbTrash size={16} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.pdf,.eps,.svg,.tex,.bib,.sty,.cls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Global New File Input */}
        {isCreatingFile && (
          <div className="p-3">
            <form onSubmit={handleAddFile} className="flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="filename.tex"
                className={`w-full px-2 py-1 text-sm rounded border focus:outline-none ${
                  isDark
                    ? "bg-[#333] border-[#555] text-white focus:border-[#777]"
                    : "bg-white border-gray-300 text-black focus:border-gray-500"
                }`}
              />
              {error && <span className="text-xs text-red-500">{error}</span>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingFile(false)}
                  className="text-xs px-2 py-1 opacity-70 hover:opacity-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`text-xs px-2 py-1 rounded ${
                    isDark
                      ? "bg-[#404040] hover:bg-[#505050]"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Global New Folder Input */}
        {isCreatingFolder && (
          <div className="p-3">
            <form onSubmit={handleAddFolder} className="flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className={`w-full px-2 py-1 text-sm rounded border focus:outline-none ${
                  isDark
                    ? "bg-[#333] border-[#555] text-white focus:border-[#777]"
                    : "bg-white border-gray-300 text-black focus:border-gray-500"
                }`}
              />
              {error && <span className="text-xs text-red-500">{error}</span>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="text-xs px-2 py-1 opacity-70 hover:opacity-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`text-xs px-2 py-1 rounded ${
                    isDark
                      ? "bg-[#404040] hover:bg-[#505050]"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {Object.keys(fileTree.folders)
            .sort()
            .map((folderName) => (
              <div key={folderName} className="mb-1 relative">
                <div
                  className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer group hover:bg-opacity-50 ${
                    isDark
                      ? "hover:bg-[#333] text-gray-300"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                  onClick={() => handleFolderToggle(folderName)}
                >
                  <div
                    className={`transition-transform duration-200 ${
                      expandedFolders[folderName] ? "rotate-90" : ""
                    }`}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                  <svg
                    className="w-4 h-4 text-[#9BC59D]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>

                  {renamingFolder === folderName ? (
                    <input
                      ref={renameFolderInputRef}
                      type="text"
                      value={renameFolderValue}
                      onChange={(e) => setRenameFolderValue(e.target.value)}
                      onBlur={() => handleFolderRenameSubmit(folderName)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleFolderRenameSubmit(folderName);
                        if (e.key === "Escape") setRenamingFolder(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`flex-1 px-1 py-0 text-[13px] font-medium tracking-tight rounded border outline-none ${
                        isDark
                          ? "bg-[#333] border-[#555] text-white focus:border-[#777]"
                          : "bg-white border-[#CFCFCF] text-black focus:border-gray-500"
                      }`}
                      autoFocus
                    />
                  ) : (
                    <span className="text-[13px] font-medium truncate flex-1 select-none">
                      {folderName}
                    </span>
                  )}

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {folderName !== "Definitions" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (folderMenuState?.folderName === folderName) {
                            setFolderMenuState(null);
                          } else {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setFolderMenuState({
                              folderName,
                              x: rect.right + 8,
                              y: rect.top,
                            });
                          }
                        }}
                        className={`p-1 rounded transition-colors ${
                          isDark
                            ? "hover:bg-gray-700 text-gray-400"
                            : "hover:bg-gray-200 text-gray-500"
                        }`}
                      >
                        <TbDotsVertical size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {folderMenuState?.folderName === folderName && (
                  <div
                    className={`fixed w-36 rounded shadow-xl border z-[99999] text-[13px] overflow-hidden ${
                      isDark
                        ? "bg-[#333] border-[#444]"
                        : "bg-white border-gray-200"
                    }`}
                    style={{ left: folderMenuState.x, top: folderMenuState.y }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setFolderMenuState(null);
                        setCreatingFileInFolder(folderName);
                        setExpandedFolders((prev) => ({
                          ...prev,
                          [folderName]: true,
                        }));
                      }}
                      className={`w-full text-left px-3 py-2 transition-colors ${
                        isDark
                          ? "text-gray-200 hover:bg-[#444]"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      New File
                    </button>
                    <button
                      onClick={() => {
                        setFolderMenuState(null);
                        targetUploadFolderRef.current = folderName;
                        fileInputRef.current?.click();
                      }}
                      className={`w-full text-left px-3 py-2 transition-colors ${
                        isDark
                          ? "text-gray-200 hover:bg-[#444]"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      onClick={() => {
                        setFolderMenuState(null);
                        handleFolderRenameStart(folderName);
                      }}
                      className={`w-full text-left px-3 py-2 transition-colors ${
                        isDark
                          ? "text-gray-200 hover:bg-[#444]"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      Rename Folder
                    </button>
                    <button
                      onClick={() => {
                        setFolderMenuState(null);
                        handleDeleteFolder(folderName);
                      }}
                      className={`w-full text-left px-3 py-2 transition-colors text-red-500 ${
                        isDark ? "hover:bg-[#444]" : "hover:bg-red-50"
                      }`}
                    >
                      Delete Folder
                    </button>
                  </div>
                )}

                {expandedFolders[folderName] && (
                  <div className="ml-4 pl-2 border-l border-gray-200/20 space-y-0.5 mt-0.5">
                    {creatingFileInFolder === folderName && (
                      <div className="px-3 py-1.5 mb-0.5">
                        <input
                          autoFocus
                          type="text"
                          placeholder="filename.tex"
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              const success = await executeAddFile(
                                e.target.value,
                                folderName,
                              );
                              if (success) setCreatingFileInFolder(null);
                            }
                            if (e.key === "Escape")
                              setCreatingFileInFolder(null);
                          }}
                          onBlur={async (e) => {
                            if (e.target.value.trim()) {
                              const success = await executeAddFile(
                                e.target.value,
                                folderName,
                              );
                              if (success) setCreatingFileInFolder(null);
                            } else {
                              setCreatingFileInFolder(null);
                            }
                          }}
                          className={`w-full px-2 py-1 text-xs rounded border focus:outline-none ${
                            isDark
                              ? "bg-[#333] border-[#555] text-white focus:border-[#777]"
                              : "bg-white border-[#CFCFCF] text-black focus:border-gray-500"
                          }`}
                        />
                      </div>
                    )}

                    {fileTree.folders[folderName].sort().map((fileName) => {
                      if (fileName.endsWith("/.gitkeep")) return null;
                      return renderFileRow(
                        fileName,
                        fileName.split("/").pop(),
                        1,
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

          {fileTree.rootFiles
            .sort()
            .map((fileName) => renderFileRow(fileName, fileName))}

          {Object.keys(fileTree.folders).length === 0 &&
            fileTree.rootFiles.length === 0 && (
              <div className="p-4 text-xs opacity-50 text-center">
                No files in project
              </div>
            )}
        </div>

        {/* User Hint for Multi-Select */}
        <div
          className={`py-1.5 px-2 flex justify-center items-center text-[10.5px] border-t ${
            isDark
              ? "border-[#404040] text-gray-500 bg-[#2b2b2b]"
              : "border-[#CFCFCF] text-gray-400 bg-gray-50/50"
          }`}
        >
          Hold{" "}
          <kbd
            className={`mx-1 px-1 py-0.5 rounded shadow-sm border font-sans text-[9px] font-semibold ${
              isDark
                ? "border-gray-600 bg-gray-700 text-gray-300"
                : "border-gray-300 bg-white text-gray-600"
            }`}
          >
            Ctrl
          </kbd>{" "}
          to select multiple files
        </div>
      </div>

      {isBulkDeleting && (
        <LinearLoading title="Deleting Files" message={bulkDeleteMessage} />
      )}

      <Toast message={toast} isVisible={!!toast} />
      <AlertModal
        isOpen={!!alertMessage}
        message={alertMessage}
        onClose={() => setAlertMessage(null)}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() =>
          setConfirmModal({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          })
        }
      />
    </div>
  );
};

export default SectionSpace;
