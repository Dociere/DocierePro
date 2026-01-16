// Create a new file: components/DebugPanel.jsx

import React, { useState, useEffect } from "react";

const DebugPanel = ({ debugLogs, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 right-0 w-96 bg-gray-900 text-white shadow-lg z-50 border-t border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">🐛 Debug Console</span>
          <span className="text-xs text-gray-400">
            ({debugLogs.length} logs)
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Clear
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            {isExpanded ? "▼" : "▲"}
          </button>
        </div>
      </div>

      {/* Logs */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto p-3 text-xs font-mono space-y-1">
          {debugLogs.length === 0 ? (
            <div className="text-gray-500 italic">No logs yet...</div>
          ) : (
            debugLogs.map((log, idx) => (
              <div
                key={idx}
                className={`py-1 px-2 rounded ${
                  log.type === "error"
                    ? "bg-red-900/30 text-red-300"
                    : log.type === "warning"
                    ? "bg-yellow-900/30 text-yellow-300"
                    : log.type === "success"
                    ? "bg-green-900/30 text-green-300"
                    : "bg-gray-800"
                }`}
              >
                <span className="text-gray-500 mr-2">{log.timestamp}</span>
                <span>{log.message}</span>
                {log.details && (
                  <div className="mt-1 pl-4 text-gray-400 border-l-2 border-gray-700">
                    {log.details}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
