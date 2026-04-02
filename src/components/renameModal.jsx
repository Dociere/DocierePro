import React, { useState, useEffect } from "react";
import { TbX } from "react-icons/tb";

const RenameModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialValue = "",
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-3 text-gray-500 hover:text-gray-800"
        >
          <TbX size={20} />
        </button>
        <h3 className="text-xl font-inter font-bold mb-4">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded mb-6 font-inter focus:outline-none focus:ring-1 focus:ring-black"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter new name"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-inter font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-inter font-medium transition-colors"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameModal;
