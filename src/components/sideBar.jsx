import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const DynamicSideBar = () => {
  return (
    <div className="bg-[#F9F9F9] mt-11 min-h-screen max-h-auto w-14 text-white fixed top-0 z-0 border-[#CFCFCF] border-r-[1px]">
      <div className="flex flex-col pt-9 pl-8 space-y-9 text-base font-light font-inter">
        {/* <Link to="/">
          <p className="flex text-[#585858] justify-between pr-8">icon 1</p>
        </Link>

        <Link to="/">
          <p className="flex text-[#585858] justify-between pr-8">icon 2</p>
        </Link>

        <Link to="/">
          <p className="flex text-[#585858] justify-between pr-8">icon 3</p>
        </Link>

        <Link to="/">
          <p className="flex text-[#585858] justify-between pr-8">icon 4</p>
        </Link> */}
      </div>
    </div>
  );
};

export default DynamicSideBar;
