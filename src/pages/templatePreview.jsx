import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import GoBack from "../assets/icons/goBack.svg?react";
import { useSettings } from "../context/useSettings";

const TemplatePreview = () => {
  const { templateKey } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const title = decodeURIComponent(templateKey);

  return (
    <div className="h-screen overflow-y-auto flex flex-col ml-36 mr-20 pb-10 mt-10">
      {/* Back link — same style as startingPage nav */}
      <div className="flex flex-row mt-20">
        <Link
          to="/template"
          className="font-inter text-sm flex items-center gap-2 hover:opacity-70 transition-opacity"
          style={{
            color:
              settings.appearance.customThemes[settings.appearance.theme].text2,
          }}
        >
          <GoBack
            style={{
              fill: settings.appearance.customThemes[settings.appearance.theme]
                .text2,
            }}
            className="w-4 h-4"
          />
          Back to Templates
        </Link>
      </div>

      <div className="mt-12 flex flex-col gap-10 lg:flex-row lg:gap-20 items-start">
        {/* Left: info + action */}
        <div className="flex flex-col gap-6 min-w-[260px]">
          <div>
            <div
              className="text-4xl font-playfair font-bold leading-tight"
              style={{
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text1,
              }}
            >
              {title}
            </div>
            <div
              className="mt-3 text-sm font-inter font-light leading-relaxed max-w-xs"
              style={{
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text3,
              }}
            >
              Standard formatting with pre-structured sections. Click "Select
              Template" to customise project details.
            </div>
          </div>

          {/* Action buttons — same style as startingPage */}
          <div className="flex flex-col gap-3 w-fit">
            <Link to={`/detailPage/${templateKey}`}>
              <div className="relative text-[#AB2D2D] text-base font-inter font-normal text-nowrap border-[#AB2D2D] pl-10 pt-[1vh] pb-[0.7vh] pr-8 border-[1px]">
                <span className="absolute left-4 font-playfair top-0 text-2xl">
                  +
                </span>
                Select Template
              </div>
            </Link>
            <Link to="/template">
              <div
                className="relative text-base font-inter font-normal text-nowrap pl-10 pt-[1vh] pb-[0.7vh] pr-8 border-[1px]"
                style={{
                  color:
                    settings.appearance.customThemes[settings.appearance.theme]
                      .text2,
                  borderColor:
                    settings.appearance.customThemes[settings.appearance.theme]
                      .text2,
                }}
              >
                <span className="absolute left-4 top-[1.5vh] text-sm">←</span>
                Go Back
              </div>
            </Link>
            <div>License:</div>
            <div>Author:</div>
            <div>
              Source: Link to Maintainer using LLPL license ||
              http://www.michaelshell.org/tex/ieeetran/
            </div>
            <div>Tags</div>
          </div>
        </div>

        {/* Right: preview image */}
        <div
          className="flex-1 max-w-[480px] aspect-[3/4] border flex items-center justify-center rounded"
          style={{
            borderColor:
              settings.appearance.customThemes[settings.appearance.theme]
                .text3 + "40",
            background:
              settings.appearance.customThemes[settings.appearance.theme]
                .text3 + "08",
          }}
        >
          <div className="text-center opacity-40">
            <svg
              className="w-12 h-12 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-xs font-inter">Preview image</p>
            <p className="text-xs font-inter opacity-60">
              templates/{templateKey}/preview.png
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
