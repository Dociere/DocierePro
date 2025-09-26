import React from "react";
import { Link } from "react-router-dom";

const DetailsPage = () => {
  return (
    <div className="flex justify-center items-center w-[91vw] h-[90vh]">
      <div className="w-[90vw] max-w-[830px] h-[545px] bg-[#F9F9F9] border border-[#A8A8A8] px-14 py-8 relative">
        {/* Heading */}
        <h1 className="font-playfair text-4xl md:text-5xl font-bold mb-3">
          Document Details
        </h1>

        {/* Subheading */}
        <p className="text-[#7D7D7D] text-sm md:text-base font-inter font-medium leading-tight mb-7 ml-1">
          Enter Details related to the Document
        </p>

        {/* Input Label: Title */}
        <label
          htmlFor="title"
          className="text-[#343434] text-base md:text-lg font-semibold font-inter block"
        >
          Title:
        </label>
        <input
          id="title"
          type="text"
          className="mt-2 mb-6 w-full max-w-md h-7 border border-[#CFCFCF] bg-[#F9F9F9] px-2"
        />

        {/* Type Selection */}
        <label className="text-[#343434] text-base md:text-lg font-semibold font-inter block mb-3">
          Type:
        </label>

        <div className="flex gap-12 mb-24">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="type"
              value="code-based"
              className="w-4 h-4 text-blue-600 bg-white border border-gray-400 rounded-full focus:ring-blue-500"
            />
            <span className="text-[#343434] text-sm md:text-base font-inter">
              Code-based
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="type"
              value="research-based"
              className="w-4 h-4 text-blue-600 bg-white border border-gray-400 rounded-full focus:ring-blue-500"
            />
            <span className="text-[#343434] text-sm md:text-base font-inter">
              Research-based
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <Link to="/">
            <div className="w-32 h-8 bg-[#D9D9D9] flex items-center justify-center">
              <span className="text-[#5F5F5F] text-base font-semibold font-inter">
                Back
              </span>
            </div>
          </Link>

          <Link to="/canvas">
            <div className="w-32 h-8 border-2 border-[#5F5F5F] flex items-center justify-center">
              <span className="text-[#5F5F5F] text-base font-semibold font-inter">
                Next
              </span>
            </div>
          </Link>
        </div>

        {/* Footer Tip */}
        <p className="mt-16 text-[#7D7D7D] text-xs font-inter font-medium leading-[15.85px] text-center whitespace-nowrap">
          Make sure to keep the Input relevant for better boilerplate template
        </p>
      </div>
    </div>
  );
};

export default DetailsPage;
