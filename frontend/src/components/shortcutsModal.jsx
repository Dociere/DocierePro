import React from "react";
import { TbX } from "react-icons/tb";

const ShortcutsModal = ({ onClose }) => {
  const shortcuts = [
    {
      category: "File",
      items: [
        { key: "Ctrl+N", description: "New Project" },
        { key: "Ctrl+O", description: "Open Project" },
        { key: "Ctrl+S", description: "Save Project" },
        { key: "Ctrl+Shift+S", description: "Save As..." },
      ],
    },
    {
      category: "Edit",
      items: [
        { key: "Ctrl+Z", description: "Undo" },
        { key: "Ctrl+Y", description: "Redo" },
        { key: "Ctrl+X", description: "Cut" },
        { key: "Ctrl+C", description: "Copy" },
        { key: "Ctrl+V", description: "Paste" },
        { key: "Ctrl+F", description: "Find" },
        { key: "Ctrl+H", description: "Replace" },
        { key: "Ctrl+A", description: "Select All" },
      ],
    },
    {
      category: "View",
      items: [
        { key: "Ctrl+1", description: "Code View" },
        { key: "Ctrl+2", description: "Text View" },
        { key: "Ctrl+3", description: "Section View" },
        { key: "Ctrl+B", description: "Toggle Section Space" },
        { key: "Ctrl+P", description: "Toggle PDF Preview" },
        { key: "Ctrl++", description: "Zoom In" },
        { key: "Ctrl+-", description: "Zoom Out" },
        { key: "Ctrl+0", description: "Reset Zoom" },
        { key: "F11", description: "Full Screen" },
        { key: "Ctrl+Shift+F", description: "Distraction Free Mode" },
      ],
    },
    {
      category: "General",
      items: [
        { key: "Ctrl+/", description: "Search" },
        { key: "Escape", description: "Close Menu/Modal" },
        { key: "?", description: "Show Keyboard Shortcuts" },
        { key: "Ctrl+Shift+P", description: "Command Palette" },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <TbX size={24} />
          </button>
        </div>
        <div className="p-6">
          {shortcuts.map((section) => (
            <div key={section.category} className="mb-6 last:mb-0">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex justify-between items-center"
                  >
                    <span className="text-gray-600">{item.description}</span>
                    <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-sm text-gray-600">
            Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">?</kbd> anytime to see shortcuts
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
