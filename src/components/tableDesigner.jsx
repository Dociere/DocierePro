import React, { useState, useEffect } from "react";

// Helper: Parse LaTeX tabular to 2D Array
const parseLatexTable = (latex) => {
  if (!latex) return [["", ""]];

  // 1. Extract content inside \begin{tabular}{...} ... \end{tabular}
  const match = latex.match(
    /\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}/,
  );
  if (!match) return [["", ""]];

  let body = match[1];

  body = body.replace(/\\hline/g, "");
  // 2. Split by row terminator (\\)
  // We filter out empty lines caused by the split
  const rows = body.split("\\\\").filter((r) => r.trim().length > 0);

  // 3. Split by column separator (&)
  return rows.map((row) =>
    row.split("&").map((cell) => {
      // 4. TRIM: Remove leading/trailing whitespace
      return cell.trim();
    }),
  );
};

// Helper: Convert 2D Array back to LaTeX
const generateLatexTable = (grid, caption = "My Table") => {
  const colCount = grid[0].length;
  // Create column definition like {|c|c|c|}
  const colDef = "|" + Array(colCount).fill("c").join("|") + "|";

  const rowsStr = grid.map((row) => row.join(" & ")).join(" \\\\ \\hline\n"); // Add horizontal line after each row for standard look

  return `\\begin{table}[htbp]
\\centering
\\caption{${caption}}
\\begin{tabular}{${colDef}}
\\hline
${rowsStr} \\\\ \\hline
\\end{tabular}
\\end{table}`;
};

const TableDesigner = ({ initialContent, onSave, onCancel }) => {
  const [grid, setGrid] = useState([["", ""]]);
  const [caption, setCaption] = useState("New Table");

  useEffect(() => {
    if (initialContent) {
      setGrid(parseLatexTable(initialContent));
      // Extract caption if exists
      const capMatch = initialContent.match(/\\caption\{([^}]+)\}/);
      if (capMatch) setCaption(capMatch[1]);
    }
  }, [initialContent]);

  const updateCell = (r, c, val) => {
    const newGrid = [...grid];
    newGrid[r] = [...newGrid[r]];
    newGrid[r][c] = val;
    setGrid(newGrid);
  };

  const addRow = () => {
    const newRow = Array(grid[0].length).fill("");
    setGrid([...grid, newRow]);
  };

  const addCol = () => {
    const newGrid = grid.map((row) => [...row, ""]);
    setGrid(newGrid);
  };

  const handleSave = () => {
    const latex = generateLatexTable(grid, caption);
    onSave(latex);
  };

  return (
    <div className="p-4 bg-white rounded border border-gray-200 shadow-sm">
      <div className="mb-4 flex gap-2 border-b pb-2">
        <button
          onClick={addRow}
          className="px-3 py-1 bg-gray-50 text-black-600 text-xs rounded hover:bg-purple-100"
        >
          + Row
        </button>
        <button
          onClick={addCol}
          className="px-3 py-1 bg-gray-50 text-black-600 text-xs rounded hover:bg-purple-100"
        >
          + Col
        </button>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="ml-auto border rounded px-2 text-sm w-48"
          placeholder="Table Caption..."
        />
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="border-collapse">
          <tbody>
            {grid.map((row, rIndex) => (
              <tr key={rIndex}>
                {row.map((cell, cIndex) => (
                  <td
                    key={cIndex}
                    className="border border-gray-300 p-0 min-w-[100px]"
                  >
                    <input
                      className="w-full h-full p-2 outline-none focus:bg-blue-50"
                      value={cell}
                      onChange={(e) =>
                        updateCell(rIndex, cIndex, e.target.value)
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2">
        {/* <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded"
        >
          Cancel
        </button> */}
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm rounded shadow-md"
        >
          Save Table
        </button>
      </div>
    </div>
  );
};

export default TableDesigner;
