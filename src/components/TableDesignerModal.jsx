import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { TbX, TbPlus, TbMinus, TbTable, TbPlayerPlay, TbCopy, TbCheck, TbAlertTriangle } from "react-icons/tb";

const API_BASE_URL = "http://localhost:5000";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const parseLatexTable = (latex) => {
  if (!latex) return null;

  try {
    const posMatch = latex.match(/\\begin\{table\}\[([^\]]*)\]/);
    const positioning = posMatch ? posMatch[1] : "h";

    const captionMatch = latex.match(/\\caption\{([^}]*)\}/);
    const caption = captionMatch ? captionMatch[1] : "";

    const labelMatch = latex.match(/\\label\{([^}]*)\}/);
    const label = labelMatch ? labelMatch[1] : "";

    const colDefMatch = latex.match(/\\begin\{tabular\}\{([^}]+)\}/);
    const colDef = colDefMatch ? colDefMatch[1] : "|c|c|";

    const alignments = [];
    const colDefClean = colDef.replace(/\|/g, "");
    for (const char of colDefClean) {
      if (["l", "c", "r"].includes(char)) {
        alignments.push(char);
      }
    }

    let borderStyle = "none";
    if (colDef.includes("|")) {
      borderStyle = latex.includes("\\hline") ? "all" : "vertical";
    } else if (latex.includes("\\hline")) {
      borderStyle = "horizontal";
    }

    const bodyMatch = latex.match(
      /\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}/
    );
    if (!bodyMatch) return null;

    let body = bodyMatch[1];
    body = body.replace(/\\hline/g, "").trim();

    const numCols = alignments.length || 2;
    const mergedCells = [];

    // Parse rows with multicolumn support
    const rows = body
      .split("\\\\")
      .filter((r) => r.trim().length > 0)
      .map((row, rowIndex) => {
        // Split by & but we need to handle multicolumn carefully
        const rawCells = row.split("&");
        const parsedRow = [];
        let colIndex = 0;

        for (const rawCell of rawCells) {
          let content = rawCell.trim();
          
          // Check for \multicolumn{n}{align}{content}
          const multiMatch = content.match(/^\\multicolumn\{(\d+)\}\{[^}]*\}\{(.+)\}$/);
          
          if (multiMatch) {
            const span = parseInt(multiMatch[1], 10);
            let innerContent = multiMatch[2];
            
            // Strip \textbf{} from content
            const textbfMatch = innerContent.match(/^\\textbf\{(.+)\}$/);
            if (textbfMatch) {
              innerContent = textbfMatch[1];
            }
            
            // Add the merged cell content at the starting position
            parsedRow.push(innerContent);
            
            // Add the merge info
            mergedCells.push({
              row: rowIndex,
              startCol: colIndex,
              endCol: colIndex + span - 1,
              content: innerContent,
            });
            
            // Add empty placeholders for the merged columns
            for (let i = 1; i < span; i++) {
              parsedRow.push("");
            }
            
            colIndex += span;
          } else {
            // Regular cell - strip \textbf{} wrapper
            const textbfMatch = content.match(/^\\textbf\{(.+)\}$/);
            if (textbfMatch) {
              content = textbfMatch[1];
            }
            parsedRow.push(content);
            colIndex++;
          }
        }

        // Ensure row has correct number of columns
        while (parsedRow.length < numCols) {
          parsedRow.push("");
        }

        return parsedRow;
      });

    const captionBeforeTabular = latex.indexOf("\\caption") < latex.indexOf("\\begin{tabular}");
    const captionPosition = captionBeforeTabular ? "top" : "bottom";

    // Detect if first row had textbf (header styling)
    const firstRowHasTextbf = latex.match(/\\begin\{tabular\}[\s\S]*?\\textbf\{/);
    
    return {
      positioning,
      caption,
      label,
      alignments,
      borderStyle,
      rows,
      cols: numCols,
      captionPosition,
      headerRow: !!firstRowHasTextbf,
      mergedCells, // Return merged cells info
    };
  } catch (e) {
    console.error("Failed to parse table:", e);
    return null;
  }
};

const generateLatexTable = ({
  rows,
  cols,
  alignments,
  borderStyle,
  positioning,
  caption,
  label,
  captionPosition,
  headerRow,
  mergedCells = [],
}) => {
  let colDef = "";
  const hasVerticalBorders = borderStyle === "all" || borderStyle === "vertical";
  
  for (let i = 0; i < cols; i++) {
    if (hasVerticalBorders) colDef += "|";
    colDef += alignments[i] || "c";
  }
  if (hasVerticalBorders) colDef += "|";

  const hasHorizontalBorders = borderStyle === "all" || borderStyle === "horizontal";
  let tableBody = "";
  
  if (hasHorizontalBorders) tableBody += "\\hline\n";
  
  rows.forEach((row, rowIndex) => {
    const cellOutputs = [];
    let colIndex = 0;
    
    while (colIndex < cols) {
      const merge = mergedCells.find(m => m.row === rowIndex && m.startCol === colIndex);
      
      if (merge) {
        const span = merge.endCol - merge.startCol + 1;
        const align = alignments[colIndex] || "c";
        let content = merge.content || "";
        
        if (headerRow && rowIndex === 0) {
          content = `\\textbf{${content}}`;
        }
        
        let multicolFormat = "";
        if (hasVerticalBorders && colIndex === 0) multicolFormat += "|";
        multicolFormat += align;
        if (hasVerticalBorders) multicolFormat += "|";
        
        cellOutputs.push(`\\multicolumn{${span}}{${multicolFormat}}{${content}}`);
        colIndex = merge.endCol + 1;
      } else {
        const hiddenByMerge = mergedCells.find(m => m.row === rowIndex && colIndex > m.startCol && colIndex <= m.endCol);
        
        if (hiddenByMerge) {
          colIndex++;
          continue;
        }
        
        let content = row[colIndex] || "";
        if (headerRow && rowIndex === 0) {
          content = `\\textbf{${content}}`;
        }
        cellOutputs.push(content);
        colIndex++;
      }
    }
    
    tableBody += cellOutputs.join(" & ") + " \\\\";
    if (hasHorizontalBorders) tableBody += " \\hline";
    tableBody += "\n";
  });

  const captionStr = caption ? `\\caption{${caption}}\n` : "";
  const labelStr = label ? `\\label{${label}}\n` : "";

  let result = `\\begin{table}[${positioning}]\n\\centering\n`;
  
  if (captionPosition === "top") {
    result += captionStr + labelStr;
  }
  
  result += `\\begin{tabular}{${colDef}}\n${tableBody}\\end{tabular}\n`;
  
  if (captionPosition === "bottom" || !captionPosition) {
    result += captionStr + labelStr;
  }
  
  result += "\\end{table}";

  return result;
};

// ==========================================
// CONFIRMATION MODAL COMPONENT
// ==========================================
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

// ==========================================
// TOAST COMPONENT
// ==========================================
const Toast = ({ message, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
      <TbCheck size={16} className="text-green-400" />
      <span className="text-sm">{message}</span>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const TableDesignerModal = ({
  isOpen,
  onClose,
  onInsert,
  initialData = null,
}) => {
  const [rowCount, setRowCount] = useState(3);
  const [colCount, setColCount] = useState(3);
  const [cells, setCells] = useState([]);
  const [alignments, setAlignments] = useState([]);
  const [positioning, setPositioning] = useState("h");
  const [borderStyle, setBorderStyle] = useState("all");
  const [caption, setCaption] = useState("");
  const [label, setLabel] = useState("");
  const [captionPosition, setCaptionPosition] = useState("bottom");
  const [headerRow, setHeaderRow] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [compiledPreviewUrl, setCompiledPreviewUrl] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedCells, setSelectedCells] = useState([]);
  const [mergedCells, setMergedCells] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const initializeTable = useCallback((rows, cols, existingData = null) => {
    if (existingData && existingData.rows) {
      setCells(existingData.rows);
      setAlignments(existingData.alignments || Array(cols).fill("c"));
      setPositioning(existingData.positioning || "h");
      setBorderStyle(existingData.borderStyle || "all");
      setCaption(existingData.caption || "");
      setLabel(existingData.label || "");
      setCaptionPosition(existingData.captionPosition || "bottom");
      setHeaderRow(existingData.headerRow || false);
    } else {
      const newCells = Array(rows).fill(null).map(() => Array(cols).fill(""));
      setCells(newCells);
      setAlignments(Array(cols).fill("c"));
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedCells([]);
      setCompiledPreviewUrl(null);
      
      if (initialData) {
        const parsed = typeof initialData === "string" 
          ? parseLatexTable(initialData) 
          : initialData;
        
        if (parsed) {
          setRowCount(parsed.rows.length);
          setColCount(parsed.cols);
          initializeTable(parsed.rows.length, parsed.cols, parsed);
          // Set merged cells from parsed data
          setMergedCells(parsed.mergedCells || []);
        } else {
          initializeTable(rowCount, colCount);
          setMergedCells([]);
        }
      } else {
        initializeTable(rowCount, colCount);
        setMergedCells([]);
      }
    }
  }, [isOpen, initialData, initializeTable]);

  const handleRowCountChange = (newCount) => {
    const count = Math.max(1, Math.min(20, newCount));
    setRowCount(count);
    
    const newCells = [...cells];
    if (count > cells.length) {
      for (let i = cells.length; i < count; i++) {
        newCells.push(Array(colCount).fill(""));
      }
    } else {
      newCells.splice(count);
    }
    setCells(newCells);
  };

  const handleColCountChange = (newCount) => {
    const count = Math.max(1, Math.min(20, newCount));
    setColCount(count);
    
    const newCells = cells.map((row) => {
      if (count > row.length) {
        return [...row, ...Array(count - row.length).fill("")];
      }
      return row.slice(0, count);
    });
    setCells(newCells);
    
    const newAlignments = [...alignments];
    if (count > alignments.length) {
      for (let i = alignments.length; i < count; i++) {
        newAlignments.push("c");
      }
    } else {
      newAlignments.splice(count);
    }
    setAlignments(newAlignments);
  };

  const updateCell = (rowIndex, colIndex, value) => {
    const newCells = cells.map((row, rIdx) =>
      rIdx === rowIndex
        ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell))
        : row
    );
    setCells(newCells);
  };

  const updateAlignment = (colIndex, value) => {
    const newAlignments = [...alignments];
    newAlignments[colIndex] = value;
    setAlignments(newAlignments);
  };

  const getLatex = () => {
    return generateLatexTable({
      rows: cells,
      cols: colCount,
      alignments,
      borderStyle,
      positioning,
      caption,
      label,
      captionPosition,
      headerRow,
      mergedCells,
    });
  };

  const handleInsert = () => {
    const latex = getLatex();
    onInsert(latex);
    showToast(initialData ? "Table updated!" : "Table inserted!");
    setTimeout(() => onClose(), 200);
  };

  const handleCompilePreview = async () => {
    const latex = getLatex();
    setIsCompiling(true);
    setCompiledPreviewUrl(null);
    
    try {
      const res = await axios.post(`${API_BASE_URL}/api/latex/compile`, {
        latex: latex,
        isTemp: true,
        fileName: "table-preview",
        format: "image",
        type: "table",
      });
      
      if (res.data.success && res.data.pdfUrl) {
        setCompiledPreviewUrl(`${API_BASE_URL}${res.data.pdfUrl}?t=${Date.now()}`);
      } else {
        showToast("Preview failed");
      }
    } catch (e) {
      console.error("Failed to compile table:", e);
      showToast("Preview failed");
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleCellSelection = (rowIndex, colIndex) => {
    const exists = selectedCells.find(c => c.row === rowIndex && c.col === colIndex);
    if (exists) {
      setSelectedCells(selectedCells.filter(c => !(c.row === rowIndex && c.col === colIndex)));
    } else {
      setSelectedCells([...selectedCells, { row: rowIndex, col: colIndex }]);
    }
  };

  const canMergeCells = () => {
    if (selectedCells.length < 2) return false;
    const rows = [...new Set(selectedCells.map(c => c.row))];
    if (rows.length !== 1) return false;
    
    const cols = selectedCells.map(c => c.col).sort((a, b) => a - b);
    for (let i = 1; i < cols.length; i++) {
      if (cols[i] !== cols[i-1] + 1) return false;
    }
    return true;
  };

  const mergeCells = () => {
    if (!canMergeCells()) return;
    
    const rowIndex = selectedCells[0].row;
    const cols = selectedCells.map(c => c.col).sort((a, b) => a - b);
    const startCol = cols[0];
    const endCol = cols[cols.length - 1];
    const content = cells[rowIndex][startCol];
    
    setMergedCells([...mergedCells, { row: rowIndex, startCol, endCol, content }]);
    setSelectedCells([]);
    showToast("Cells merged");
  };

  const unmergeCells = (rowIndex, colIndex) => {
    setMergedCells(mergedCells.filter(m => !(m.row === rowIndex && m.startCol === colIndex)));
    showToast("Cells unmerged");
  };

  const getMergedCell = (rowIndex, colIndex) => {
    return mergedCells.find(m => m.row === rowIndex && colIndex >= m.startCol && colIndex <= m.endCol);
  };

  const isCellHidden = (rowIndex, colIndex) => {
    const merged = getMergedCell(rowIndex, colIndex);
    return merged && colIndex !== merged.startCol;
  };

  const isCellSelected = (rowIndex, colIndex) => {
    return selectedCells.some(c => c.row === rowIndex && c.col === colIndex);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getLatex());
    showToast("LaTeX copied!");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm font-sans"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 w-[95vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 font-inter">
            <TbTable className="text-gray-700" />
            {initialData ? "Edit Table" : "Table Designer"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <TbX size={24} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Panel - Settings */}
          <div className="w-[240px] flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Dimensions */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Dimensions</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <span className="text-xs text-gray-500">Rows</span>
                    <div className="flex items-center mt-1">
                      <button
                        onClick={() => handleRowCountChange(rowCount - 1)}
                        className="p-1 bg-white border border-gray-300 rounded-l hover:bg-gray-100"
                        disabled={rowCount <= 1}
                      >
                        <TbMinus size={12} />
                      </button>
                      <input
                        type="number"
                        value={rowCount}
                        onChange={(e) => handleRowCountChange(parseInt(e.target.value) || 1)}
                        className="w-10 text-center border-t border-b border-gray-300 py-1 text-sm"
                      />
                      <button
                        onClick={() => handleRowCountChange(rowCount + 1)}
                        className="p-1 bg-white border border-gray-300 rounded-r hover:bg-gray-100"
                      >
                        <TbPlus size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="text-xs text-gray-500">Cols</span>
                    <div className="flex items-center mt-1">
                      <button
                        onClick={() => handleColCountChange(colCount - 1)}
                        className="p-1 bg-white border border-gray-300 rounded-l hover:bg-gray-100"
                        disabled={colCount <= 1}
                      >
                        <TbMinus size={12} />
                      </button>
                      <input
                        type="number"
                        value={colCount}
                        onChange={(e) => handleColCountChange(parseInt(e.target.value) || 1)}
                        className="w-10 text-center border-t border-b border-gray-300 py-1 text-sm"
                      />
                      <button
                        onClick={() => handleColCountChange(colCount + 1)}
                        className="p-1 bg-white border border-gray-300 rounded-r hover:bg-gray-100"
                      >
                        <TbPlus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layout */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Layout</label>
                <div className="space-y-2">
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
                  <div>
                    <span className="text-xs text-gray-500">Borders</span>
                    <select
                      value={borderStyle}
                      onChange={(e) => setBorderStyle(e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="all">All</option>
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Caption & Label */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Caption</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Table caption..."
                  className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <div className="flex gap-1 mt-2">
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="tab:label"
                    className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                  <select
                    value={captionPosition}
                    onChange={(e) => setCaptionPosition(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-gray-300 rounded text-xs"
                  >
                    <option value="top">Top</option>
                    <option value="bottom">Btm</option>
                  </select>
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={headerRow}
                    onChange={(e) => setHeaderRow(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Bold header row
                </label>
              </div>

              {/* Column Alignments */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Align</label>
                <div className="flex flex-wrap gap-1">
                  {alignments.slice(0, 6).map((align, idx) => (
                    <select
                      key={idx}
                      value={align}
                      onChange={(e) => updateAlignment(idx, e.target.value)}
                      className="w-9 px-1 py-1 bg-white border border-gray-300 rounded text-xs"
                      title={`Column ${idx + 1}`}
                    >
                      <option value="l">L</option>
                      <option value="c">C</option>
                      <option value="r">R</option>
                    </select>
                  ))}
                  {alignments.length > 6 && (
                    <span className="text-xs text-gray-400">+{alignments.length - 6}</span>
                  )}
                </div>
              </div>

              {/* Merge Controls */}
              {selectedCells.length > 0 && (
                <div className="bg-gray-200 rounded p-2 border border-gray-300">
                  <span className="text-xs font-bold text-gray-600">{selectedCells.length} selected</span>
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={mergeCells}
                      disabled={!canMergeCells()}
                      className={`flex-1 px-2 py-1 text-xs rounded ${
                        canMergeCells()
                          ? "bg-black text-white hover:bg-gray-800"
                          : "bg-gray-300 text-gray-500"
                      }`}
                    >
                      Merge
                    </button>
                    <button
                      onClick={() => setSelectedCells([])}
                      className="px-2 py-1 text-xs rounded bg-white border border-gray-300 hover:bg-gray-100"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Editor */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Table Grid */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="text-xs text-gray-400 mb-2">Ctrl+Click cells to select for merge</div>
              <div className="inline-block border border-gray-200 rounded-lg bg-white min-w-full">
                <table className="border-collapse">
                  <tbody>
                    {cells.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, colIndex) => {
                          const merged = getMergedCell(rowIndex, colIndex);
                          const isHidden = isCellHidden(rowIndex, colIndex);
                          const isSelected = isCellSelected(rowIndex, colIndex);
                          
                          if (isHidden) return null;
                          
                          const colSpan = merged ? merged.endCol - merged.startCol + 1 : 1;
                          
                          return (
                            <td 
                              key={colIndex} 
                              className={`p-0 border border-gray-300 relative ${
                                isSelected ? "bg-blue-100 ring-2 ring-blue-500 ring-inset" : ""
                              } ${merged ? "bg-gray-100" : ""}`}
                              colSpan={colSpan}
                            >
                              <input
                                type="text"
                                value={merged ? merged.content : cell}
                                onChange={(e) => {
                                  if (merged) {
                                    const newMerged = mergedCells.map(m => 
                                      m.row === rowIndex && m.startCol === colIndex 
                                        ? {...m, content: e.target.value} 
                                        : m
                                    );
                                    setMergedCells(newMerged);
                                  } else {
                                    updateCell(rowIndex, colIndex, e.target.value);
                                  }
                                }}
                                onClick={(e) => {
                                  if (e.ctrlKey || e.metaKey) {
                                    e.preventDefault();
                                    toggleCellSelection(rowIndex, colIndex);
                                  }
                                }}
                                className={`w-full px-2 py-1.5 text-sm outline-none min-w-[70px] ${
                                  isSelected ? "bg-blue-100" : ""
                                } ${headerRow && rowIndex === 0 ? "font-bold bg-gray-100" : ""}`}
                                placeholder={`${rowIndex + 1},${colIndex + 1}`}
                              />
                              {merged && (
                                <button
                                  onClick={() => unmergeCells(rowIndex, colIndex)}
                                  className="absolute top-0 right-0 w-4 h-4 bg-gray-700 text-white text-xs rounded-bl hover:bg-black flex items-center justify-center"
                                  title="Unmerge"
                                >
                                  ×
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Preview Section */}
            <div className="border-t border-gray-200 bg-gray-50 p-3 flex-shrink-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Preview</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-gray-600 hover:text-black px-2 py-1 hover:bg-gray-200 rounded"
                  >
                    {showPreview ? "Hide Code" : "Show Code"}
                  </button>
                  <button
                    onClick={handleCompilePreview}
                    disabled={isCompiling}
                    className="text-xs bg-gray-800 text-white px-3 py-1 rounded hover:bg-black disabled:opacity-50 flex items-center gap-1"
                  >
                    <TbPlayerPlay size={12} />
                    {isCompiling ? "..." : "Compile"}
                  </button>
                </div>
              </div>
              {showPreview && (
                <pre className="bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto max-h-[80px] font-mono mb-2">
                  {getLatex()}
                </pre>
              )}
              {compiledPreviewUrl && (
                <div className="bg-white border border-gray-200 rounded p-2 text-center overflow-auto max-h-[120px]">
                  <img src={compiledPreviewUrl} alt="Table preview" className="max-h-[100px] mx-auto" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-3 border-t border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-black px-2 py-1 hover:bg-gray-100 rounded"
          >
            <TbCopy size={14} /> Copy
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-gray-600 hover:bg-gray-100 rounded font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              className="px-5 py-1.5 bg-black text-white rounded hover:bg-gray-800 font-medium"
            >
              {initialData ? "Update" : "Insert"}
            </button>
          </div>
        </div>
      </div>
      
      <Toast message={toast} isVisible={!!toast} />
    </div>
  );
};

export default TableDesignerModal;
export { parseLatexTable, generateLatexTable };
