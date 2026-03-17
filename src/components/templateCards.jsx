// import React from "react";
// import { useSettings } from "../context/useSettings";

// const TemplateCards = ({ title }) => {
//   const { settings } = useSettings();
//   return (
//     <>
//       <div className="flex flex-col">
//         <div className="w-44 h-56 bg-[#F9F9F9] border-[#c6c6c6] border-2 flex-shrink-0 rounded-md"></div>
//         <p
//           className="mt-2 font-inter text-center font-normal w-44 break-words"
//           style={{
//             color:
//               settings.appearance.customThemes[settings.appearance.theme].text2,
//           }}
//         >
//           {title}
//         </p>
//       </div>
//     </>
//   );
// };

// export default TemplateCards;
// import React from "react";
// import { useSettings } from "../context/useSettings";

// const TemplateCards = ({ title, onDeleteClick }) => {
//   // 1. Accept onDeleteClick prop
//   const { settings } = useSettings();
//   const isDark = settings.appearance.theme === "dark";

//   return (
//     <div className="flex flex-col group relative">
//       {" "}
//       {/* 2. Add 'group' and 'relative' */}
//       {/* The Menu Button */}
//       <button
//         onClick={(e) => {
//           e.preventDefault(); // Stop Link navigation
//           e.stopPropagation(); // Stop event bubbling
//           onDeleteClick(); // Trigger the modal logic in parent
//         }}
//         className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm transition-all duration-200"
//       >
//         {/* Vertical Dots Icon */}
//         <svg
//           width="16"
//           height="16"
//           viewBox="0 0 16 16"
//           fill="none"
//           xmlns="http://www.w3.org/2000/svg"
//         >
//           <path
//             d="M8 4a1 1 0 100-2 1 1 0 000 2zm0 5a1 1 0 100-2 1 1 0 000 2zm0 5a1 1 0 100-2 1 1 0 000 2z"
//             fill={isDark ? "#212121" : "#7D7D7D"}
//             stroke={isDark ? "#212121" : "#7D7D7D"}
//             strokeWidth="1"
//           />
//         </svg>
//       </button>
//       {/* Card Body */}
//       <div
//         className={`w-44 h-56 border-2 flex-shrink-0 rounded-md transition-colors ${
//           isDark
//             ? "bg-[#2d2d2d] border-[#404040] group-hover:border-[#AB2D2D]"
//             : "bg-[#F9F9F9] border-[#c6c6c6] group-hover:border-[#AB2D2D]"
//         }`}
//       ></div>
//       <p
//         className="mt-2 font-inter text-center font-normal w-44 break-words"
//         style={{
//           color:
//             settings.appearance.customThemes[settings.appearance.theme].text2,
//         }}
//       >
//         {title}
//       </p>
//     </div>
//   );
// };

// export default TemplateCards;
import React, { useState } from "react";
import { useSettings } from "../context/useSettings";

const TemplateCards = ({ title, onDeleteClick }) => {
  const { settings } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // State to toggle dropdown

  const isDark = settings.appearance.theme === "dark";
  const theme = settings.appearance.customThemes[settings.appearance.theme];

  return (
    <div
      className="flex flex-col group relative"
      onMouseLeave={() => setIsMenuOpen(false)} // Auto-close when mouse leaves card
    >
      {/* Three Dots Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
        className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm transition-all duration-200"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 4a1 1 0 100-2 1 1 0 000 2zm0 5a1 1 0 100-2 1 1 0 000 2zm0 5a1 1 0 100-2 1 1 0 000 2z"
            fill={isDark ? "#212121" : "#7D7D7D"}
          />
        </svg>
      </button>

      {/* Dropdown Menu - Styled similar to SideBar profile */}
      {isMenuOpen && (
        <div
          className="absolute right-2 top-10 z-30 min-w-[100px] rounded-md border shadow-lg animate-in fade-in zoom-in duration-150"
          style={{
            backgroundColor: isDark ? "#2d2d2d" : "#F9F9F9",
            borderColor: theme.border,
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMenuOpen(false);
              onDeleteClick(); // This opens the confirmation modal
            }}
            className="w-full text-left px-4 py-2 text-sm font-inter transition-colors bg-red-100 text-red-600 hover:font-semibold"
          >
            Delete
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMenuOpen(false);
              //   onDeleteClick(); // This opens the confirmation modal
            }}
            className="w-full text-left px-4 py-2 text-sm font-inter transition-colors hover:font-semibold"
          >
            Rename
          </button>

          {/* You can easily add more options here in the future */}
          {/* <button className="...">Rename</button> */}
        </div>
      )}

      {/* Card Visual */}
      <div
        className={`w-44 h-56 border-2 flex-shrink-0 rounded-md transition-colors ${
          isDark
            ? "bg-[#2d2d2d] border-[#404040] group-hover:border-[#ffffff]"
            : "bg-[#F9F9F9] border-[#c6c6c6] group-hover:border-[#646464]"
        }`}
      ></div>

      {/* Title */}
      <p
        className="mt-2 font-inter text-center font-normal w-44 break-words"
        style={{ color: theme.text2 }}
      >
        {title}
      </p>
    </div>
  );
};

export default TemplateCards;
