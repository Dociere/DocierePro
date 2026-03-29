// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { TbX, TbPhoto, TbCopy, TbCheck, TbPlayerPlay, TbAlertTriangle } from "react-icons/tb";
// import { projectContext } from "../context/useProject";

// const API_BASE_URL = "http://localhost:5000";

// // ==========================================
// // HELPER FUNCTIONS
// // ==========================================

// const parseLatexFigure = (latex) => {
//   if (!latex) return null;

//   try {
//     const posMatch = latex.match(/\\begin\{figure\}\[([^\]]*)\]/);
//     const positioning = posMatch ? posMatch[1] : "h";

//     const captionMatch = latex.match(/\\caption\{([^}]*)\}/);
//     const caption = captionMatch ? captionMatch[1] : "";

//     const labelMatch = latex.match(/\\label\{([^}]*)\}/);
//     const label = labelMatch ? labelMatch[1] : "";

//     // Parse width - extract number and unit separately
//     const widthMatch = latex.match(/width\s*=\s*([\d.]+)(\\?[a-z]+|cm|mm|in|pt)?/i);
//     const widthValue = widthMatch ? widthMatch[1] : "";
//     const widthUnit = widthMatch && widthMatch[2] ? widthMatch[2] : "";

//     // Parse height
//     const heightMatch = latex.match(/height\s*=\s*([\d.]+)(\\?[a-z]+|cm|mm|in|pt)?/i);
//     const heightValue = heightMatch ? heightMatch[1] : "";
//     const heightUnit = heightMatch && heightMatch[2] ? heightMatch[2] : "";

//     const scaleMatch = latex.match(/scale\s*=\s*([\d.]+)/i);
//     const scale = scaleMatch ? scaleMatch[1] : "";

//     const imagePathMatch = latex.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/);
//     const imagePath = imagePathMatch ? imagePathMatch[1] : "";

//     const captionBeforeInclude = latex.indexOf("\\caption") < latex.indexOf("\\includegraphics");
//     const captionPosition = captionBeforeInclude ? "top" : "bottom";

//     const centering = latex.includes("\\centering");

//     return {
//       positioning,
//       caption,
//       label,
//       widthValue,
//       widthUnit,
//       heightValue,
//       heightUnit,
//       scale,
//       imagePath,
//       captionPosition,
//       centering,
//     };
//   } catch (e) {
//     console.error("Failed to parse figure:", e);
//     return null;
//   }
// };

// const generateLatexFigure = ({
//   imagePath,
//   widthValue,
//   widthUnit,
//   heightValue,
//   heightUnit,
//   scale,
//   positioning,
//   caption,
//   label,
//   captionPosition,
//   centering,
//   sizeMode,
// }) => {
//   let optionsArr = [];

//   if (sizeMode === "width" && widthValue) {
//     optionsArr.push(`width=${widthValue}${widthUnit}`);
//   } else if (sizeMode === "height" && heightValue) {
//     optionsArr.push(`height=${heightValue}${heightUnit}`);
//   } else if (sizeMode === "scale" && scale) {
//     optionsArr.push(`scale=${scale}`);
//   }

//   const options = optionsArr.length > 0 ? `[${optionsArr.join(", ")}]` : "";

//   const captionStr = caption ? `\\caption{${caption}}\n` : "";
//   const labelStr = label ? `\\label{${label}}\n` : "";
//   const centeringStr = centering ? "\\centering\n" : "";

//   let result = `\\begin{figure}[${positioning}]\n${centeringStr}`;

//   if (captionPosition === "top") {
//     result += captionStr + labelStr;
//   }

//   result += `\\includegraphics${options}{${imagePath}}\n`;

//   if (captionPosition === "bottom" || !captionPosition) {
//     result += captionStr + labelStr;
//   }

//   result += "\\end{figure}";

//   return result;
// };

// // Width unit presets
// const WIDTH_PRESETS = [
//   { label: "0.5×Text", value: "0.5", unit: "\\textwidth" },
//   { label: "0.8×Text", value: "0.8", unit: "\\textwidth" },
//   { label: "Full Text", value: "1", unit: "\\textwidth" },
//   { label: "Column", value: "1", unit: "\\columnwidth" },
//   { label: "0.8×Col", value: "0.8", unit: "\\columnwidth" },
//   { label: "Line", value: "1", unit: "\\linewidth" },
// ];

// const HEIGHT_PRESETS = [
//   { label: "3cm", value: "3", unit: "cm" },
//   { label: "5cm", value: "5", unit: "cm" },
//   { label: "8cm", value: "8", unit: "cm" },
//   { label: "10cm", value: "10", unit: "cm" },
//   { label: "0.3×Text", value: "0.3", unit: "\\textheight" },
//   { label: "0.5×Text", value: "0.5", unit: "\\textheight" },
// ];

// const SCALE_PRESETS = [
//   { label: "50%", value: "0.5" },
//   { label: "75%", value: "0.75" },
//   { label: "100%", value: "1.0" },
//   { label: "125%", value: "1.25" },
// ];

// // ==========================================
// // TOAST COMPONENT
// // ==========================================
// const Toast = ({ message, isVisible }) => {
//   if (!isVisible) return null;

//   return (
//     <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
//       <TbCheck size={16} className="text-green-400" />
//       <span className="text-sm">{message}</span>
//     </div>
//   );
// };

// // ==========================================
// // ALERT MODAL
// // ==========================================
// const AlertModal = ({ isOpen, message, onClose }) => {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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

// // ==========================================
// // MAIN COMPONENT
// // ==========================================
// const ImageInsertModal = ({
//   isOpen,
//   onClose,
//   onInsert,
//   initialData = null,
//   projectFiles = [],
//   showInsertButton = false,
// }) => {
//   const { projectDetails } = React.useContext(projectContext);
//   const [imagePath, setImagePath] = useState("");
//   const [widthValue, setWidthValue] = useState("0.8");
//   const [widthUnit, setWidthUnit] = useState("\\textwidth");
//   const [heightValue, setHeightValue] = useState("5");
//   const [heightUnit, setHeightUnit] = useState("cm");
//   const [scale, setScale] = useState("1.0");
//   const [sizeMode, setSizeMode] = useState("width");
//   const [positioning, setPositioning] = useState("h");
//   const [caption, setCaption] = useState("");
//   const [label, setLabel] = useState("");
//   const [captionPosition, setCaptionPosition] = useState("bottom");
//   const [centering, setCentering] = useState(true);
//   const [showPreview, setShowPreview] = useState(false);
//   const [toast, setToast] = useState(null);
//   const [alertMessage, setAlertMessage] = useState(null);
//   const [compiledPreviewUrl, setCompiledPreviewUrl] = useState(null);
//   const [isCompiling, setIsCompiling] = useState(false);

//   const imageFiles = projectFiles.filter(file =>
//     /\.(png|jpg|jpeg|gif|svg|pdf|eps)$/i.test(file)
//   );

//   const showToast = (message) => {
//     setToast(message);
//     setTimeout(() => setToast(null), 2000);
//   };

//   useEffect(() => {
//     if (isOpen && initialData) {
//       const parsed = typeof initialData === "string"
//         ? parseLatexFigure(initialData)
//         : initialData;

//       if (parsed) {
//         setImagePath(parsed.imagePath || "");
//         setWidthValue(parsed.widthValue || "0.8");
//         setWidthUnit(parsed.widthUnit || "\\textwidth");
//         setHeightValue(parsed.heightValue || "5");
//         setHeightUnit(parsed.heightUnit || "cm");
//         setScale(parsed.scale || "1.0");
//         setPositioning(parsed.positioning || "h");
//         setCaption(parsed.caption || "");
//         setLabel(parsed.label || "");
//         setCaptionPosition(parsed.captionPosition || "bottom");
//         setCentering(parsed.centering !== false);
//         setCompiledPreviewUrl(null);

//         if (parsed.scale) setSizeMode("scale");
//         else if (parsed.heightValue) setSizeMode("height");
//         else setSizeMode("width");
//       }
//     } else if (isOpen && !initialData) {
//       setImagePath("");
//       setWidthValue("0.8");
//       setWidthUnit("\\textwidth");
//       setHeightValue("5");
//       setHeightUnit("cm");
//       setScale("1.0");
//       setSizeMode("width");
//       setPositioning("h");
//       setCaption("");
//       setLabel("");
//       setCaptionPosition("bottom");
//       setCentering(true);
//       setCompiledPreviewUrl(null);
//     }
//   }, [isOpen, initialData]);

//   const getLatex = () => {
//     return generateLatexFigure({
//       imagePath,
//       widthValue,
//       widthUnit,
//       heightValue,
//       heightUnit,
//       scale,
//       positioning,
//       caption,
//       label,
//       captionPosition,
//       centering,
//       sizeMode,
//     });
//   };

//   const handleCompilePreview = async () => {
//     if (!imagePath.trim()) {
//       setAlertMessage("Please enter an image path first");
//       return;
//     }

//     const latex = getLatex();
//     setIsCompiling(true);
//     setCompiledPreviewUrl(null);

//     try {
//       const res = await axios.post(`${API_BASE_URL}/api/latex/compile`, {
//         latex: latex,
//         isTemp: true,
//         fileName: "figure-preview",
//         format: "image",
//         type: "figure",
//       });

//       if (res.data.success && res.data.pdfUrl) {
//         setCompiledPreviewUrl(`${API_BASE_URL}${res.data.pdfUrl}?t=${Date.now()}`);
//       } else {
//         showToast("Preview failed");
//       }
//     } catch (e) {
//       console.error("Failed to compile figure:", e);
//       showToast("Preview failed - image may not exist");
//     } finally {
//       setIsCompiling(false);
//     }
//   };

//   const copyToClipboard = () => {
//     if (!imagePath.trim()) {
//       setAlertMessage("Please enter an image path first");
//       return;
//     }
//     navigator.clipboard.writeText(getLatex());
//     showToast("LaTeX copied to clipboard!");
//   };

//   if (!isOpen) return null;

//   return (
//     <div
//       className="fixed inset-0 z-[100000] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm font-sans"
//       onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
//     >
//       <div className="bg-white rounded-xl shadow-2xl border border-gray-300 w-[95vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden">
//         {/* Header */}
//         <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
//           <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 font-inter">
//             <TbPhoto className="text-gray-700" />
//             {initialData ? "Edit Figure" : "Insert Figure"}
//           </h2>
//           <button
//             onClick={onClose}
//             className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100"
//           >
//             <TbX size={24} />
//           </button>
//         </div>

//         {/* Main Content */}
//         <div className="flex flex-1 overflow-hidden min-h-0">
//           {/* Left Panel - Settings */}
//           <div className="w-[280px] flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto p-4 space-y-5">

//             {/* Image Selection */}
//             <div>
//               <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Image File</label>
//               {imageFiles.length > 0 ? (
//                 <select
//                   value={imagePath}
//                   onChange={(e) => setImagePath(e.target.value)}
//                   className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
//                 >
//                   <option value="">Select an image...</option>
//                   {imageFiles.map((file) => (
//                     <option key={file} value={file}>{file}</option>
//                   ))}
//                 </select>
//               ) : (
//                 <div className="text-xs text-gray-500 mb-1">No images in project.</div>
//               )}
//               <input
//                 type="text"
//                 value={imagePath}
//                 onChange={(e) => setImagePath(e.target.value)}
//                 placeholder="path/to/image.png"
//                 className="w-full mt-2 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono"
//               />
//             </div>

//             {/* Size Options */}
//             <div>
//               <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Size Mode</label>
//               <div className="flex gap-1 mb-3">
//                 {["width", "height", "scale"].map((mode) => (
//                   <button
//                     key={mode}
//                     onClick={() => setSizeMode(mode)}
//                     className={`flex-1 px-2 py-1 text-xs rounded font-medium transition-colors ${
//                       sizeMode === mode
//                         ? "bg-black text-white"
//                         : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
//                     }`}
//                   >
//                     {mode.charAt(0).toUpperCase() + mode.slice(1)}
//                   </button>
//                 ))}
//               </div>

//               {sizeMode === "width" && (
//                 <div className="space-y-2">
//                   <div className="flex gap-2 items-center">
//                     <input
//                       type="number"
//                       step="0.1"
//                       min="0"
//                       value={widthValue}
//                       onChange={(e) => setWidthValue(e.target.value)}
//                       className="w-20 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
//                       placeholder="0.8"
//                     />
//                     <select
//                       value={widthUnit}
//                       onChange={(e) => setWidthUnit(e.target.value)}
//                       className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
//                     >
//                       <option value="\\textwidth">\textwidth</option>
//                       <option value="\\columnwidth">\columnwidth</option>
//                       <option value="\\linewidth">\linewidth</option>
//                       <option value="\\paperwidth">\paperwidth</option>
//                       <option value="cm">cm</option>
//                       <option value="mm">mm</option>
//                       <option value="in">in</option>
//                       <option value="pt">pt</option>
//                     </select>
//                   </div>
//                   <div className="flex flex-wrap gap-1">
//                     {WIDTH_PRESETS.map((preset) => (
//                       <button
//                         key={preset.label}
//                         onClick={() => { setWidthValue(preset.value); setWidthUnit(preset.unit); }}
//                         className="px-2 py-1 text-[10px] bg-white border border-gray-200 hover:bg-gray-100 rounded text-gray-600"
//                       >
//                         {preset.label}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {sizeMode === "height" && (
//                 <div className="space-y-2">
//                   <div className="flex gap-2 items-center">
//                     <input
//                       type="number"
//                       step="0.5"
//                       min="0"
//                       value={heightValue}
//                       onChange={(e) => setHeightValue(e.target.value)}
//                       className="w-20 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
//                       placeholder="5"
//                     />
//                     <select
//                       value={heightUnit}
//                       onChange={(e) => setHeightUnit(e.target.value)}
//                       className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
//                     >
//                       <option value="cm">cm</option>
//                       <option value="mm">mm</option>
//                       <option value="in">in</option>
//                       <option value="pt">pt</option>
//                       <option value="\\textheight">\textheight</option>
//                       <option value="\\paperheight">\paperheight</option>
//                     </select>
//                   </div>
//                   <div className="flex flex-wrap gap-1">
//                     {HEIGHT_PRESETS.map((preset) => (
//                       <button
//                         key={preset.label}
//                         onClick={() => { setHeightValue(preset.value); setHeightUnit(preset.unit); }}
//                         className="px-2 py-1 text-[10px] bg-white border border-gray-200 hover:bg-gray-100 rounded text-gray-600"
//                       >
//                         {preset.label}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {sizeMode === "scale" && (
//                 <div className="space-y-2">
//                   <input
//                     type="number"
//                     step="0.1"
//                     min="0.1"
//                     max="3"
//                     value={scale}
//                     onChange={(e) => setScale(e.target.value)}
//                     className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
//                     placeholder="1.0"
//                   />
//                   <div className="flex flex-wrap gap-1">
//                     {SCALE_PRESETS.map((preset) => (
//                       <button
//                         key={preset.label}
//                         onClick={() => setScale(preset.value)}
//                         className="px-2 py-1 text-[10px] bg-white border border-gray-200 hover:bg-gray-100 rounded text-gray-600"
//                       >
//                         {preset.label}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Layout Options */}
//             <div>
//               <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Layout</label>
//               <div className="space-y-3">
//                 <div>
//                   <span className="text-xs text-gray-500">Position</span>
//                   <select
//                     value={positioning}
//                     onChange={(e) => setPositioning(e.target.value)}
//                     className="w-full mt-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
//                   >
//                     <option value="h">Here [h]</option>
//                     <option value="t">Top [t]</option>
//                     <option value="b">Bottom [b]</option>
//                     <option value="H">Exact [H]</option>
//                     <option value="!htbp">Force [!htbp]</option>
//                   </select>
//                 </div>
//                 <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
//                   <input
//                     type="checkbox"
//                     checked={centering}
//                     onChange={(e) => setCentering(e.target.checked)}
//                     className="rounded border-gray-300"
//                   />
//                   Center image
//                 </label>
//               </div>
//             </div>

//             {/* Caption & Label */}
//             <div>
//               <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Caption</label>
//               <div className="space-y-2">
//                 <input
//                   type="text"
//                   value={caption}
//                   onChange={(e) => setCaption(e.target.value)}
//                   placeholder="Figure caption..."
//                   className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
//                 />
//                 <input
//                   type="text"
//                   value={label}
//                   onChange={(e) => setLabel(e.target.value)}
//                   placeholder="fig:label"
//                   className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
//                 />
//                 <select
//                   value={captionPosition}
//                   onChange={(e) => setCaptionPosition(e.target.value)}
//                   className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
//                 >
//                   <option value="top">Caption Position: Top</option>
//                   <option value="bottom">Caption Position: Bottom</option>
//                 </select>
//               </div>
//             </div>

//           </div>

//           {/* Right Panel - Preview & Editor */}
//           <div className="flex-1 flex flex-col min-w-0 bg-white p-6 overflow-y-auto">

//             {/* Preview Section */}
//             <div className="mb-6 flex flex-col flex-1 min-h-[300px]">
//               <div className="flex justify-between items-center mb-3">
//                 <h3 className="text-sm font-semibold text-gray-800">Preview</h3>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => setShowPreview(!showPreview)}
//                     className={`text-xs px-3 py-1.5 rounded font-medium border transition-colors ${
//                       showPreview ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
//                     }`}
//                   >
//                     View Code
//                   </button>
//                   <button
//                     onClick={handleCompilePreview}
//                     disabled={isCompiling || !imagePath}
//                     className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1.5 font-medium transition-colors"
//                   >
//                     <TbPlayerPlay size={14} />
//                     {isCompiling ? "Compiling..." : "Compile Preview"}
//                   </button>
//                 </div>
//               </div>

//               <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg flex flex-col overflow-hidden relative">
//                 {showPreview ? (
//                   <div className="absolute inset-0 z-10 bg-gray-900 text-gray-100 p-4 font-mono text-sm overflow-auto">
//                     <pre>{getLatex()}</pre>
//                   </div>
//                 ) : null}

//                 <div className="flex-1 flex items-center justify-center p-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2YwZjBmMCIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4=')]">
//                   {compiledPreviewUrl ? (
//                     <img
//                       src={compiledPreviewUrl}
//                       alt="Figure preview"
//                       className="max-w-full max-h-full object-contain shadow-md border border-gray-200 bg-white"
//                     />
//                   ) : (
//                     <div className="text-center text-gray-400">
//                       <TbPhoto size={48} className="mx-auto mb-2 opacity-50" />
//                       <p className="text-sm">Click Compile to generate preview</p>
//                       {!imagePath && <p className="text-xs mt-1 text-amber-500">Image path is required</p>}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//           </div>
//         </div>

//         {/* Footer */}
//         <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
//           <div className="text-sm text-gray-500 font-medium">
//             {initialData ? "Updating existing figure" : "Ready to insert"}
//           </div>
//           <div className="flex gap-3">
//             <button
//               onClick={onClose}
//               className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-md font-medium transition-colors"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={copyToClipboard}
//               className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors flex items-center gap-2 shadow-sm"
//               title="Copy to clipboard"
//             >
//               <TbCopy size={18} /> Copy
//             </button>
//             {showInsertButton && onInsert && (
//               <button
//                 onClick={() => {
//                   onInsert(getLatex());
//                   onClose();
//                 }}
//                 className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-medium transition-colors shadow-sm"
//               >
//                 {initialData ? "Update Figure" : "Insert Figure"}
//               </button>
//             )}
//           </div>
//         </div>
//       </div>

//       <Toast message={toast} isVisible={!!toast} />
//       <AlertModal
//         isOpen={!!alertMessage}
//         message={alertMessage}
//         onClose={() => setAlertMessage(null)}
//       />
//     </div>
//   );
// };

// export default ImageInsertModal;
// export { parseLatexFigure, generateLatexFigure };
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  TbX,
  TbPhoto,
  TbCopy,
  TbCheck,
  TbPlayerPlay,
  TbAlertTriangle,
  TbUpload,
  TbFolderPlus,
} from "react-icons/tb";
import { projectContext } from "../context/useProject";
import { useAuth } from "../context/useAuth";
import { saveProject } from "../api/projectHandling";

const API_BASE_URL = "http://localhost:5000";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const parseLatexFigure = (latex) => {
  if (!latex) return null;

  try {
    const posMatch = latex.match(/\\begin\{figure\}\[([^\]]*)\]/);
    const positioning = posMatch ? posMatch[1] : "h";

    const captionMatch = latex.match(/\\caption\{([^}]*)\}/);
    const caption = captionMatch ? captionMatch[1] : "";

    const labelMatch = latex.match(/\\label\{([^}]*)\}/);
    const label = labelMatch ? labelMatch[1] : "";

    const widthMatch = latex.match(
      /width\s*=\s*([\d.]+)(\\?[a-z]+|cm|mm|in|pt)?/i,
    );
    const widthValue = widthMatch ? widthMatch[1] : "";
    const widthUnit = widthMatch && widthMatch[2] ? widthMatch[2] : "";

    const heightMatch = latex.match(
      /height\s*=\s*([\d.]+)(\\?[a-z]+|cm|mm|in|pt)?/i,
    );
    const heightValue = heightMatch ? heightMatch[1] : "";
    const heightUnit = heightMatch && heightMatch[2] ? heightMatch[2] : "";

    const scaleMatch = latex.match(/scale\s*=\s*([\d.]+)/i);
    const scale = scaleMatch ? scaleMatch[1] : "";

    const imagePathMatch = latex.match(
      /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/,
    );
    const imagePath = imagePathMatch ? imagePathMatch[1] : "";

    const captionBeforeInclude =
      latex.indexOf("\\caption") < latex.indexOf("\\includegraphics");
    const captionPosition = captionBeforeInclude ? "top" : "bottom";

    const centering = latex.includes("\\centering");

    return {
      positioning,
      caption,
      label,
      widthValue,
      widthUnit,
      heightValue,
      heightUnit,
      scale,
      imagePath,
      captionPosition,
      centering,
    };
  } catch (e) {
    console.error("Failed to parse figure:", e);
    return null;
  }
};

const generateLatexFigure = ({
  imagePath,
  widthValue,
  widthUnit,
  heightValue,
  heightUnit,
  scale,
  positioning,
  caption,
  label,
  captionPosition,
  centering,
  sizeMode,
}) => {
  let optionsArr = [];

  if (sizeMode === "width" && widthValue) {
    optionsArr.push(`width=${widthValue}${widthUnit}`);
  } else if (sizeMode === "height" && heightValue) {
    optionsArr.push(`height=${heightValue}${heightUnit}`);
  } else if (sizeMode === "scale" && scale) {
    optionsArr.push(`scale=${scale}`);
  }

  const options = optionsArr.length > 0 ? `[${optionsArr.join(", ")}]` : "";

  const captionStr = caption ? `\\caption{${caption}}\n` : "";
  const labelStr = label ? `\\label{${label}}\n` : "";
  const centeringStr = centering ? "\\centering\n" : "";

  let result = `\\begin{figure}[${positioning}]\n${centeringStr}`;

  if (captionPosition === "top") {
    result += captionStr + labelStr;
  }

  result += `\\includegraphics${options}{${imagePath}}\n`;

  if (captionPosition === "bottom" || !captionPosition) {
    result += captionStr + labelStr;
  }

  result += "\\end{figure}";

  return result;
};

// Width unit presets
const WIDTH_PRESETS = [
  { label: "0.5×Text", value: "0.5", unit: "\\textwidth" },
  { label: "0.8×Text", value: "0.8", unit: "\\textwidth" },
  { label: "Full Text", value: "1", unit: "\\textwidth" },
  { label: "Column", value: "1", unit: "\\columnwidth" },
  { label: "0.8×Col", value: "0.8", unit: "\\columnwidth" },
  { label: "Line", value: "1", unit: "\\linewidth" },
];

const HEIGHT_PRESETS = [
  { label: "3cm", value: "3", unit: "cm" },
  { label: "5cm", value: "5", unit: "cm" },
  { label: "8cm", value: "8", unit: "cm" },
  { label: "10cm", value: "10", unit: "cm" },
  { label: "0.3×Text", value: "0.3", unit: "\\textheight" },
  { label: "0.5×Text", value: "0.5", unit: "\\textheight" },
];

const SCALE_PRESETS = [
  { label: "50%", value: "0.5" },
  { label: "75%", value: "0.75" },
  { label: "100%", value: "1.0" },
  { label: "125%", value: "1.25" },
];

const Toast = ({ message, isVisible }) => {
  if (!isVisible) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300000] bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
      <TbCheck size={16} className="text-green-400" />
      <span className="text-sm">{message}</span>
    </div>
  );
};

const AlertModal = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[400000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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

const ImageInsertModal = ({
  isOpen,
  onClose,
  onInsert,
  initialData = null,
  showInsertButton = false,
}) => {
  const { projectDetails, updateProjectDetails } =
    React.useContext(projectContext);
  const { isServerConnected, isAuthenticated } = useAuth();

  const [imagePath, setImagePath] = useState("");
  const [widthValue, setWidthValue] = useState("0.8");
  const [widthUnit, setWidthUnit] = useState("\\textwidth");
  const [heightValue, setHeightValue] = useState("5");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [scale, setScale] = useState("1.0");
  const [sizeMode, setSizeMode] = useState("width");
  const [positioning, setPositioning] = useState("h");
  const [caption, setCaption] = useState("");
  const [label, setLabel] = useState("");
  const [captionPosition, setCaptionPosition] = useState("bottom");
  const [centering, setCentering] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [compiledPreviewUrl, setCompiledPreviewUrl] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const fileInputRef = useRef(null);
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [uploadTargetType, setUploadTargetType] = useState("root");
  const [selectedExistingFolder, setSelectedExistingFolder] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  // Fix: Derive imageFiles directly from context instead of relying on props
  const imageFiles = React.useMemo(() => {
    const files = projectDetails?.currentProject?.files || {};
    return Object.keys(files).filter((file) =>
      /\.(png|jpg|jpeg|gif|svg|pdf|eps)$/i.test(file),
    );
  }, [projectDetails?.currentProject?.files]);

  const existingFolders = React.useMemo(() => {
    const folders = new Set();
    Object.keys(projectDetails?.currentProject?.files || {}).forEach((path) => {
      const slashIdx = path.lastIndexOf("/");
      if (slashIdx > 0) folders.add(path.substring(0, slashIdx));
    });
    return Array.from(folders).sort();
  }, [projectDetails?.currentProject?.files]);

  useEffect(() => {
    if (existingFolders.length > 0 && !selectedExistingFolder) {
      setSelectedExistingFolder(existingFolders[0]);
    }
  }, [existingFolders]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    if (isOpen && initialData) {
      const parsed =
        typeof initialData === "string"
          ? parseLatexFigure(initialData)
          : initialData;

      if (parsed) {
        setImagePath(parsed.imagePath || "");
        setWidthValue(parsed.widthValue || "0.8");
        setWidthUnit(parsed.widthUnit || "\\textwidth");
        setHeightValue(parsed.heightValue || "5");
        setHeightUnit(parsed.heightUnit || "cm");
        setScale(parsed.scale || "1.0");
        setPositioning(parsed.positioning || "h");
        setCaption(parsed.caption || "");
        setLabel(parsed.label || "");
        setCaptionPosition(parsed.captionPosition || "bottom");
        setCentering(parsed.centering !== false);
        setCompiledPreviewUrl(null);

        if (parsed.scale) setSizeMode("scale");
        else if (parsed.heightValue) setSizeMode("height");
        else setSizeMode("width");
      }
    } else if (isOpen && !initialData) {
      setImagePath("");
      setWidthValue("0.8");
      setWidthUnit("\\textwidth");
      setHeightValue("5");
      setHeightUnit("cm");
      setScale("1.0");
      setSizeMode("width");
      setPositioning("h");
      setCaption("");
      setLabel("");
      setCaptionPosition("bottom");
      setCentering(true);
      setCompiledPreviewUrl(null);
    }
  }, [isOpen, initialData]);

  const getLatex = () => {
    return generateLatexFigure({
      imagePath,
      widthValue,
      widthUnit,
      heightValue,
      heightUnit,
      scale,
      positioning,
      caption,
      label,
      captionPosition,
      centering,
      sizeMode,
    });
  };

  const handleCompilePreview = async () => {
    if (!imagePath.trim()) {
      setAlertMessage("Please enter an image path first");
      return;
    }

    const latex = getLatex();
    setIsCompiling(true);
    setCompiledPreviewUrl(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/latex/compile`, {
        latex: latex,
        isTemp: true,
        fileName: "figure-preview",
        format: "image",
        type: "figure",
      });

      if (res.data.success && res.data.pdfUrl) {
        setCompiledPreviewUrl(
          `${API_BASE_URL}${res.data.pdfUrl}?t=${Date.now()}`,
        );
      } else {
        showToast("Preview failed");
      }
    } catch (e) {
      console.error("Failed to compile figure:", e);
      showToast("Preview failed - image may not exist");
    } finally {
      setIsCompiling(false);
    }
  };

  const copyToClipboard = () => {
    if (!imagePath.trim()) {
      setAlertMessage("Please enter an image path first");
      return;
    }
    navigator.clipboard.writeText(getLatex());
    showToast("LaTeX copied to clipboard!");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingUploadFile(file);
    setShowDestinationModal(true);
    e.target.value = "";
  };

  const handleConfirmUpload = async () => {
    if (!pendingUploadFile || !projectDetails?.currentProject) return;

    let targetPath = "";
    if (uploadTargetType === "existing") {
      targetPath = selectedExistingFolder;
    } else if (uploadTargetType === "new") {
      if (
        !newFolderName.trim() ||
        newFolderName.includes("/") ||
        newFolderName.includes("\\")
      ) {
        setAlertMessage("Please enter a valid folder name (no slashes).");
        return;
      }
      targetPath = newFolderName.trim();
    }

    const fileName = pendingUploadFile.name;
    const finalFilePath = targetPath ? `${targetPath}/${fileName}` : fileName;

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(pendingUploadFile);
      });

      const updatedProject = { ...projectDetails.currentProject };
      const newFiles = { ...updatedProject.files };

      newFiles[finalFilePath] = {
        name: finalFilePath.split("/").pop(),
        content: dataUrl,
        type: fileName.split(".").pop(),
        isImage: true,
      };

      if (uploadTargetType === "new") {
        newFiles[`${targetPath}/.gitkeep`] = {
          name: ".gitkeep",
          content: "",
          type: "gitkeep",
        };
      }

      updatedProject.files = newFiles;

      updateProjectDetails({ currentProject: updatedProject });

      await saveProject(
        updatedProject,
        projectDetails.activeFile,
        projectDetails.compilationStatus,
        projectDetails.compilationMessage,
        isServerConnected,
        isAuthenticated,
      );

      setImagePath(finalFilePath);
      setShowDestinationModal(false);
      setPendingUploadFile(null);
      setNewFolderName("");
      showToast("Image uploaded to project!");
    } catch (err) {
      console.error("Upload failed:", err);
      setAlertMessage("Failed to upload image. " + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 w-[95vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 font-inter">
            <TbPhoto className="text-gray-700" />
            {initialData ? "Edit Figure" : "Insert Figure"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <TbX size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="w-[280px] flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto p-4 space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                Image File
              </label>
              <div className="flex gap-2 mb-1">
                <select
                  value={imagePath}
                  onChange={(e) => setImagePath(e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 min-w-0"
                >
                  <option value="">Select an image...</option>
                  {imageFiles.map((file) => (
                    <option key={file} value={file}>
                      {file}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700 flex items-center gap-1 shrink-0 transition-colors shadow-sm"
                  title="Upload new image"
                >
                  <TbUpload size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.gif,.svg,.pdf,.eps"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <input
                type="text"
                value={imagePath}
                onChange={(e) => setImagePath(e.target.value)}
                placeholder="path/to/image.png"
                className="w-full mt-2 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                Size Mode
              </label>
              <div className="flex gap-1 mb-3">
                {["width", "height", "scale"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSizeMode(mode)}
                    className={`flex-1 px-2 py-1 text-xs rounded font-medium transition-colors ${
                      sizeMode === mode
                        ? "bg-black text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              {sizeMode === "width" && (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={widthValue}
                      onChange={(e) => setWidthValue(e.target.value)}
                      className="w-20 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                      placeholder="0.8"
                    />
                    <select
                      value={widthUnit}
                      onChange={(e) => setWidthUnit(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="\\textwidth">\textwidth</option>
                      <option value="\\columnwidth">\columnwidth</option>
                      <option value="\\linewidth">\linewidth</option>
                      <option value="\\paperwidth">\paperwidth</option>
                      <option value="cm">cm</option>
                      <option value="mm">mm</option>
                      <option value="in">in</option>
                      <option value="pt">pt</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {WIDTH_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setWidthValue(preset.value);
                          setWidthUnit(preset.unit);
                        }}
                        className="px-2 py-1 text-[10px] bg-white border border-gray-200 hover:bg-gray-100 rounded text-gray-600"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sizeMode === "height" && (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={heightValue}
                      onChange={(e) => setHeightValue(e.target.value)}
                      className="w-20 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                      placeholder="5"
                    />
                    <select
                      value={heightUnit}
                      onChange={(e) => setHeightUnit(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="cm">cm</option>
                      <option value="mm">mm</option>
                      <option value="in">in</option>
                      <option value="pt">pt</option>
                      <option value="\\textheight">\textheight</option>
                      <option value="\\paperheight">\paperheight</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {HEIGHT_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setHeightValue(preset.value);
                          setHeightUnit(preset.unit);
                        }}
                        className="px-2 py-1 text-[10px] bg-white border border-gray-200 hover:bg-gray-100 rounded text-gray-600"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sizeMode === "scale" && (
                <div className="space-y-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="3"
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    placeholder="1.0"
                  />
                  <div className="flex flex-wrap gap-1">
                    {SCALE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setScale(preset.value)}
                        className="px-2 py-1 text-[10px] bg-white border border-gray-200 hover:bg-gray-100 rounded text-gray-600"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                Layout
              </label>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500">Position</span>
                  <select
                    value={positioning}
                    onChange={(e) => setPositioning(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="h">Here [h]</option>
                    <option value="t">Top [t]</option>
                    <option value="b">Bottom [b]</option>
                    <option value="H">Exact [H]</option>
                    <option value="!htbp">Force [!htbp]</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={centering}
                    onChange={(e) => setCentering(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Center image
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                Caption
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Figure caption..."
                  className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="fig:label"
                  className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <select
                  value={captionPosition}
                  onChange={(e) => setCaptionPosition(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="top">Caption Position: Top</option>
                  <option value="bottom">Caption Position: Bottom</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0 bg-white p-6 overflow-y-auto">
            <div className="mb-6 flex flex-col flex-1 min-h-[300px]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Preview</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`text-xs px-3 py-1.5 rounded font-medium border transition-colors ${
                      showPreview
                        ? "bg-gray-800 text-white border-gray-800"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    View Code
                  </button>
                  <button
                    onClick={handleCompilePreview}
                    disabled={isCompiling || !imagePath}
                    className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <TbPlayerPlay size={14} />
                    {isCompiling ? "Compiling..." : "Compile Preview"}
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg flex flex-col overflow-hidden relative">
                {showPreview ? (
                  <div className="absolute inset-0 z-10 bg-gray-900 text-gray-100 p-4 font-mono text-sm overflow-auto">
                    <pre>{getLatex()}</pre>
                  </div>
                ) : null}

                <div className="flex-1 flex items-center justify-center p-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2YwZjBmMCIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4=')]">
                  {compiledPreviewUrl ? (
                    <img
                      src={compiledPreviewUrl}
                      alt="Figure preview"
                      className="max-w-full max-h-full object-contain shadow-md border border-gray-200 bg-white"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <TbPhoto size={48} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        Click Compile to generate preview
                      </p>
                      {!imagePath && (
                        <p className="text-xs mt-1 text-amber-500">
                          Image path is required
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-500 font-medium">
            {initialData ? "Updating existing figure" : "Ready to insert"}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={copyToClipboard}
              className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors flex items-center gap-2 shadow-sm"
              title="Copy to clipboard"
            >
              <TbCopy size={18} /> Copy
            </button>
            {showInsertButton && onInsert && (
              <button
                onClick={() => {
                  onInsert(getLatex());
                  onClose();
                }}
                className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-medium transition-colors shadow-sm"
              >
                {initialData ? "Update Figure" : "Insert Figure"}
              </button>
            )}
          </div>
        </div>

        {showDestinationModal && (
          <div className="absolute inset-0 z-[200000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 rounded-xl">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <TbFolderPlus size={20} className="text-gray-700" /> Upload
                Destination
              </h3>
              <p className="text-sm text-gray-500 mb-5 border-b pb-4">
                Where do you want to save{" "}
                <span className="font-mono text-gray-700 bg-gray-100 px-1 rounded">
                  {pendingUploadFile?.name}
                </span>
                ?
              </p>

              <div className="space-y-4 mb-6">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="uploadTarget"
                    checked={uploadTargetType === "root"}
                    onChange={() => setUploadTargetType("root")}
                    className="w-4 h-4 text-black focus:ring-black border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    Root Directory (/)
                  </span>
                </label>

                {existingFolders.length > 0 && (
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="uploadTarget"
                      checked={uploadTargetType === "existing"}
                      onChange={() => setUploadTargetType("existing")}
                      className="w-4 h-4 mt-1 text-black focus:ring-black border-gray-300"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-800 block mb-1">
                        Existing Folder
                      </span>
                      <select
                        disabled={uploadTargetType !== "existing"}
                        value={selectedExistingFolder}
                        onChange={(e) =>
                          setSelectedExistingFolder(e.target.value)
                        }
                        className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50"
                      >
                        {existingFolders.map((folder) => (
                          <option key={folder} value={folder}>
                            {folder}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                )}

                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="uploadTarget"
                    checked={uploadTargetType === "new"}
                    onChange={() => setUploadTargetType("new")}
                    className="w-4 h-4 mt-1 text-black focus:ring-black border-gray-300"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-800 block mb-1">
                      Create New Folder
                    </span>
                    <input
                      type="text"
                      disabled={uploadTargetType !== "new"}
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder name"
                      className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50"
                    />
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDestinationModal(false);
                    setPendingUploadFile(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpload}
                  className="px-5 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-medium transition-colors shadow-sm"
                >
                  Upload & Select
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Toast message={toast} isVisible={!!toast} />
      <AlertModal
        isOpen={!!alertMessage}
        message={alertMessage}
        onClose={() => setAlertMessage(null)}
      />
    </div>
  );
};

export default ImageInsertModal;
export { parseLatexFigure, generateLatexFigure };
