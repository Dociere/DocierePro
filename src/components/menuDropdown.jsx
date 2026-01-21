import React, { useEffect, useRef } from "react";
import { useSettings } from "../context/useSettings";

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

  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`absolute border shadow-lg z-50 min-w-[200px] transition-colors duration-200 ${isDark ? 'bg-[#2d2d2d] border-[#404040]' : 'bg-white border-[#CFCFCF]'
        }`}
      style={{ top: position.top, left: position.left }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              className={`border-t my-1 ${isDark ? 'border-[#404040]' : 'border-[#E0E0E0]'
                }`}
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
            className={`w-full text-left px-4 py-2 text-sm font-inter flex items-center justify-between transition-colors
              ${item.disabled
                ? "text-gray-500 cursor-not-allowed"
                : isDark
                  ? "text-[#e5e5e5] hover:bg-[#404040] cursor-pointer"
                  : "text-[#212121] hover:bg-[#F0F0F0] cursor-pointer"
              }`}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className={`text-xs ml-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MenuDropdown;
