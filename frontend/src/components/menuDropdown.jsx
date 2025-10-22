import React, { useEffect, useRef } from "react";

const MenuDropdown = ({ isOpen, onClose, items, position }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute bg-white border border-[#CFCFCF] shadow-lg z-50 min-w-[200px]"
      style={{ top: position.top, left: position.left }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              className="border-t border-[#E0E0E0] my-1"
            />
          );
        }

        return (
          <button
            key={item.label}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={`w-full text-left px-4 py-2 text-sm font-inter flex items-center justify-between
              ${
                item.disabled
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-[#212121] hover:bg-[#F0F0F0] cursor-pointer"
              }`}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-gray-500 ml-8">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MenuDropdown;
