import React from "react";

const LinearLoading = ({
  message = "Generating Boilerplate code from AI Model",
}) => {
  return (
    <div>
      <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/20">
        <div className="bg-white rounded-xl shadow-lg w-96 p-4 relative h-40 flex flex-col items-center justify-center">
          <div className="text-center text-black font-inter font-medium mb-3">
            <p>Creating your Project</p>
          </div>
          <div className="w-72 h-1 bg-gray-200 overflow-hidden relative flex">
            <div className="absolute left-0 top-0 h-full w-1/3 bg-black animate-slide"></div>
          </div>
          <div className="text-center text-gray-400 font-inter font-normal text-[12px] mt-4">
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinearLoading;
