import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/useSettings";

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";

  // List of constant pages
  const staticPages = [
    { name: "Create New Project", path: "/template" },
    { name: "Settings", path: "/settings" },
    { name: "Profile", path: "/profile" },
  ];

  // Handle keydown events
  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === "/") {
      e.preventDefault();
      setIsActive(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }

    if (e.key === "Escape") {
      setQuery("");
      setIsActive(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }

    if (e.key === "Enter" && filteredResults.length > 0) {
      handleResultClick(filteredResults[0]);
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setIsActive(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (query === "") {
        setIsActive(false);
      }
    }, 200);
  };

  const handleClear = () => {
    setQuery("");
    setIsActive(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (query.trim()) {
      const results = staticPages.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase().trim())
      );
      setFilteredResults(results);
    } else {
      setFilteredResults([]);
    }
  }, [query]);

  const handleResultClick = (item) => {
    navigate(item.path);
    setQuery("");
    setIsActive(false);
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [filteredResults]);

  return (
    <div className="relative w-80 mt-2">
      <div className="group flex items-center relative">
        <svg
          className={`absolute left-4 w-4 h-4 transition-colors ${isDark ? 'fill-[#a0a0a0]' : 'fill-[#656565]'}`}
          aria-hidden="true"
          viewBox="0 0 24 24"
        >
          <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="search projects..."
          value={query}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => setIsActive(true)}
          className={`w-full h-8 text-sm font-inter pl-10 pr-12 outline-none transition duration-300 border-solid border-2 ${isDark
            ? 'bg-[#1a1a1a] border-[#404040] text-[#e5e5e5] placeholder:text-[#666666]'
            : 'bg-[#F9F9F9] border-[#CFCFCF] text-black placeholder:text-[#656565]'
            }`}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute text-2xl right-5 text-gray-600 hover:text-gray-800"
          >
            ×
          </button>
        )}
      </div>

      {isActive && filteredResults.length > 0 && (
        <div className={`absolute z-20 mt-2 w-full border rounded-sm shadow-lg max-h-60 overflow-y-auto transition-colors ${isDark ? 'bg-[#2d2d2d] border-[#404040]' : 'bg-white border-[#CFCFCF]'
          }`}>
          {filteredResults.map((result, index) => (
            <div
              key={index}
              onMouseDown={() => handleResultClick(result)}
              className={`px-4 py-2 cursor-pointer font-inter transition-colors ${isDark
                ? 'text-[#e5e5e5] hover:bg-[#404040]'
                : 'text-gray-800 hover:bg-gray-100'
                }`}
            >
              <div className="flex justify-between items-center">
                <span>{result.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {isActive && query && filteredResults.length === 0 && (
        <div className={`absolute z-20 mt-2 w-full border rounded-md shadow-lg max-h-60 overflow-y-auto transition-colors ${isDark ? 'bg-[#2d2d2d] border-[#404040]' : 'bg-white border-[#CFCFCF]'
          }`}>
          <div className={`px-4 py-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No results found</div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
