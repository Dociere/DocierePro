import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useSettings } from "../context/useSettings";
import { createProject } from "../api/projectHandling";
import LinearLoading from "../components/loading/linearLoading";

const DetailsPage = () => {
  const navigate = useNavigate();
  const { templateTitle } = useParams(); // templateTitle is actually the templateKey (e.g. "ieee_conference")
  const { user } = useAuth();
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";

  // All templates accessed from the local templates folder are "local".
  // Server-sourced templates will use a different flow in the future.
  const templateSource = "local";

  const [title, setTitle] = useState("");
  const [userIdea, setUserIdea] = useState("");
  const [isGenChecked, setIsGenChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Derived — no useEffect needed
  const isFormValid = title.trim() !== "";

  const handleGenCheck = () => {
    setIsGenChecked(!isGenChecked);
  };

  const handleNextClick = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please enter a project title.");
      return;
    }

    // Author validation commented out
    /*
    for (const author of authorDetails) {
      if (!author.name.trim()) {
        alert("Please enter author name.");
        return;
      }
    }
    */

    setIsLoading(true);

    try {
      const projectId = await createProject(
        title,
        [], // Empty authors array
        userIdea,
        isGenChecked,
        user?.name,
        templateTitle,
        templateSource, // Pass source
        e,
      );

      if (projectId) {
        navigate("/canvas");
      }
    } catch (error) {
      console.error("Project creation failed:", error);
      // Show error to user
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-screen">
      {isLoading && <LinearLoading />}
      <div className="w-[90vw] max-w-[830px] h-auto bg-[#F9F9F9] border border-[#A8A8A8] px-14 py-8 relative">
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
          <span className="text-red-400 text-sm mr-1">*</span>Title:
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-2 mb-6 w-full max-w-md h-7 border border-[#CFCFCF] bg-[#F9F9F9] px-2"
        />

        {/* Author Details Section - Commented Out */}
        {/*
        {templateTitle !== "blank" && (
          <div className="mt-8">
            <p className={`font-inter font-medium mb-3 ${isDark ? "text-gray-300" : "text-[#525252]"}`}>
              Author Details
            </p>
            {authorDetails.map((author, index) => (
              <div key={index} className="flex gap-4 mb-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={author.name}
                  onChange={(e) => handleAuthorChange(index, "name", e.target.value)}
                  className={`flex-1 p-3 rounded border outline-none ${
                    isDark 
                      ? "bg-[#252525] border-[#404040] text-white focus:border-[#666]" 
                      : "bg-white border-[#E5E5E5] text-black focus:border-black"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Affiliation"
                  value={author.affiliation}
                  onChange={(e) => handleAuthorChange(index, "affiliation", e.target.value)}
                  className={`flex-1 p-3 rounded border outline-none ${
                    isDark 
                      ? "bg-[#252525] border-[#404040] text-white focus:border-[#666]" 
                      : "bg-white border-[#E5E5E5] text-black focus:border-black"
                  }`}
                />
              </div>
            ))}
            
             <button
              type="button"
              onClick={addAuthor}
              className={`mt-2 text-sm font-medium ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
            >
              + Add another author
            </button> 
          </div>
        )}
        */}

        <div className="flex items-center gap-3 mt-5">
          <p className="text-[#343434] text-base font-medium font-inter">
            Generate a boilerplate or a paraphrased document?
          </p>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="boilerplate"
              checked={isGenChecked}
              onChange={handleGenCheck}
              className="h-4 w-4 border-gray-300 rounded text-blue-500 focus:ring-blue-500"
            />
            <label
              htmlFor="boilerplate"
              className="text-sm font-inter text-[#343434]"
            >
              Yes
            </label>
          </div>
        </div>

        {isGenChecked && (
          <>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your document idea
              </label>
              <textarea
                value={userIdea}
                onChange={(e) => setUserIdea(e.target.value)}
                placeholder="E.g., A research paper on machine learning applications in healthcare..."
                className="w-full max-w-md h-32 border border-[#CFCFCF] bg-[#F9F9F9] px-2 py-2 resize-none"
              />
            </div>
            {/* <label
              htmlFor="githubUrl"
              className="text-[#343434] text-base font-medium font-inter block mt-5"
            >
              Github URL
            </label>
            <input
              id="githubUrl"
              type="text"
              // value={title}
              // placeholder="Github URL"
              // onChange={(e) => setTitle(e.target.value)}
              className="mt-2 mb-6 w-full max-w-md h-7 border border-[#CFCFCF] bg-[#F9F9F9] px-2"
            /> */}
          </>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <Link to="/template">
            <div className="w-32 h-8 bg-[#D9D9D9] flex items-center justify-center">
              <span className="text-[#5F5F5F] text-base font-semibold font-inter">
                Back
              </span>
            </div>
          </Link>

          {isFormValid ? (
            <>
              <Link id="tour-details-next" to="#" onClick={handleNextClick}>
                <div className="w-32 h-8 border-2 flex items-center justify-center border-[#5F5F5F]">
                  <span className="text-base font-semibold font-inter text-[#5F5F5F]">
                    Next
                  </span>
                </div>
              </Link>
            </>
          ) : (
            <>
              <div className="w-32 h-8 border-2 flex items-center justify-center border-[#D9D9D9]">
                <span className="text-base font-semibold font-inter text-[#D9D9D9]">
                  Next
                </span>
              </div>
            </>
          )}
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
