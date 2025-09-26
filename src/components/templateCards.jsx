import React from "react";

const TemplateCards = ({ title }) => {
  return (
    <>
      <div className="flex flex-col">
        <div className="w-44 h-56 bg-[#F9F9F9] border-[#c6c6c6] border-2 flex-shrink-0"></div>
        <p className="mt-2 font-inter text-center font-medium">{title}</p>
      </div>
    </>
  );
};

export default TemplateCards;
