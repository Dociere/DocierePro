import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import { createProject } from "../api/projectHandling";

const DetailsPage = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [authorInstitute, setAuthorInstitute] = useState("");
  const [authorDegree, setAuthorDegree] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const [isGenChecked, setIsGenChecked] = useState(false);
  const [userIdea, setUserIdea] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { templateTitle } = useParams(); // Get the template title from the URL

  // Effect to check if all required fields are filled
  useEffect(() => {
    let isValid = false;

    if (templateTitle === "Blank Document") {
      // Only title is required for Blank Document
      isValid = title.trim() !== "";
    } else {
      // All fields are required for other templates
      isValid =
        title.trim() !== "" &&
        authorName.trim() !== "" &&
        authorEmail.trim() !== "" &&
        authorInstitute.trim() !== "" &&
        authorDegree.trim() !== "";
    }

    setIsFormValid(isValid);
  }, [
    title,
    authorName,
    authorEmail,
    authorInstitute,
    authorDegree,
    templateTitle,
  ]);

  const handleGenCheck = () => {
    setIsGenChecked(!isGenChecked);
  };

  const handleNextClick = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const authorDetails = {
        name: authorName,
        email: authorEmail,
        institute: authorInstitute,
        degree: authorDegree,
      };

      const projectId = await createProject(
        title,
        authorDetails,
        userIdea,
        isGenChecked,
        e
      );

      navigate("/canvas");
    } catch (error) {
      console.error("Project creation failed:", error);
      // Show error to user
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-screen">
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

        {/* Author Details */}
        {templateTitle !== "Blank Document" && (
          <div className="my-6">
            <h2 className="text-[#343434] text-lg font-semibold font-inter mb-3">
              Author Details
            </h2>

            {/* Author Name */}
            <label
              htmlFor="authorName"
              className="text-[#343434] text-sm font-medium font-inter block"
            >
              <span className="text-red-400 text-xs mr-1">*</span>Name:
            </label>
            <input
              id="authorName"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="mt-2 mb-4 w-full max-w-md h-7 border border-[#CFCFCF] bg-[#F9F9F9] px-2"
            />

            {/* Author Email */}
            <label
              htmlFor="authorEmail"
              className="text-[#343434] text-sm font-medium font-inter block"
            >
              <span className="text-red-400 text-xs mr-1">*</span>Email:
            </label>
            <input
              id="authorEmail"
              type="email"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              className="mt-2 mb-4 w-full max-w-md h-7 border border-[#CFCFCF] bg-[#F9F9F9] px-2"
            />

            {/* Author Institute/Organization */}
            <label
              htmlFor="authorInstitute"
              className="text-[#343434] text-sm font-medium font-inter block"
            >
              <span className="text-red-400 text-xs mr-1">*</span>
              Institute/Organization:
            </label>
            <input
              id="authorInstitute"
              type="text"
              value={authorInstitute}
              onChange={(e) => setAuthorInstitute(e.target.value)}
              className="mt-2 mb-4 w-full max-w-md h-7 border border-[#CFCFCF] bg-[#F9F9F9] px-2"
            />

            {/* Author Designation/Degree */}
            <label
              htmlFor="authorDegree"
              className="text-[#343434] text-sm font-medium font-inter block"
            >
              <span className="text-red-400 text-xs mr-1">*</span>
              Designation/Degree:
            </label>
            <input
              id="authorDegree"
              type="text"
              value={authorDegree}
              onChange={(e) => setAuthorDegree(e.target.value)}
              className="mt-2 mb-4 w-full max-w-md h-7 border border-[#CFCFCF] bg-[#F9F9F9] px-2"
            />
          </div>
        )}

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
            <label
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
            />
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
              <Link to="#" onClick={handleNextClick}>
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
