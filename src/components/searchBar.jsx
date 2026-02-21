import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const SearchBar = ({ data }) => {
  const [query, setQuery] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const searchData = data.map((item) => ({
    name: item.title,
    path: `/canvas?project=${item.id}`,
  }));

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
      navigate(filteredResults[0].path);
      setQuery("");
      setIsActive(false);
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsActive(true); // Keep dropdown active while typing
  };

  // Handle blur event
  const handleBlur = () => {
    setTimeout(() => {
      if (query === "") {
        setIsActive(false);
      }
    }, 200); // Delay to allow click on result
  };

  // Clear the query
  const handleClear = () => {
    setQuery("");
    setIsActive(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Filter searchData based on the query
  useEffect(() => {
    if (query.trim()) {
      const results = searchData.filter((page) =>
        page.name?.toLowerCase().includes(query?.toLowerCase().trim()),
      );
      setFilteredResults(results);
    } else {
      setFilteredResults([]);
    }
  }, [query]);

  // Handle result click
  const handleResultClick = (path) => {
    navigate(path);
    setQuery("");
    setIsActive(false);
  };

  // Attach the keydown event listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [filteredResults]); // Add filteredResults as dependency for Enter key navigation

  return (
    <div className="relative w-[24vw] mt-2">
      <div className="group flex items-center relative">
        <svg
          className="absolute left-4 fill-gray-600 w-4 h-4"
          aria-hidden="true"
          viewBox="0 0 24 24"
        >
          <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="search"
          value={query}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => setIsActive(true)} // Show dropdown on focus
          className="w-full h-8 text-sm font-inter pl-10 pr-12 text-[gray-800] bg-[#F9F9F9] border-solid border-2 rounded-sm border-[#CFCFCF] outline-none transition duration-300 placeholder:text-[#656565]"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute text-2xl right-5 text-gray-600 hover:text-gray-800"
          >
            ×
          </button>
        )}
        {/* {!isActive && !query && (
          <div className="absolute text-xs right-3 font-thin text-[#666666] cursor-pointer px-3 py-1 font-mono tracking-tighter">
            ctrl + /
          </div>
        )} */}
      </div>

      {isActive && filteredResults.length > 0 && (
        <div className="absolute z-20 mt-2 w-full bg-white border rounded-sm shadow-lg max-h-60 overflow-y-auto">
          {filteredResults.map((result, index) => (
            <div
              key={index}
              onMouseDown={() => handleResultClick(result.path)} // Use onMouseDown to handle click before blur
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 font-inter text-gray-800"
            >
              {result.name}
            </div>
          ))}
        </div>
      )}
      {isActive && query && filteredResults.length === 0 && (
        <div className="absolute z-20 mt-2 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="px-4 py-2 text-gray-500">No results found</div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
