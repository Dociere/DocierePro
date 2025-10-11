import React from "react";
import { Link } from "react-router-dom";
import FileOpen from "../assets/icons/fileOpen.svg?react";

const StartingPage = () => {
  return (
    <div className="h-auto mt-20 flex flex-col ml-52">
      <div>
        <div className="text-black text-5xl font-playfair font-bold leading-[32px]">
          Docière Pro
        </div>
        <div className="mt-4 text-[#7D7D7D] text-3xl font-inter font-extralight tracking-wide">
          Latex Redefined
        </div>
        <div className="mt-10 text-[#3B3B3B] text-base font-inter font-medium leading-[20px]">
          Get started
        </div>

        <div className="mt-5 gap-5 flex flex-col w-fit">
          <Link to="/template">
            <div className="relative text-[#AB2D2D] text-base font-inter font-medium text-nowrap border-[#AB2D2D] pl-14 pt-[1.1vh] pb-[0.7vh] pr-10 border-[1px]">
              <span className="absolute left-5 font-playfair top-1 text-2xl">
                +
              </span>
              Create New Project
            </div>
          </Link>
          <div className="relative text-[#256081] text-base font-inter font-medium text-nowrap border-[#256081] pl-14 pt-[1.1vh] pb-[0.7vh] pr-0 border-[1px]">
            <span className="absolute left-5 top-[1.9vh]">
              <FileOpen style={{ fill: "#256081" }} className="w-4 h-4" />
            </span>
            Open Existing Project
          </div>
        </div>
      </div>

      {/* <div className="absolute left-[211px] top-[462px] text-[#555555] text-2xl font-inter font-medium leading-[20px]">
        Recent Projects
      </div> */}
    </div>
  );
};

export default StartingPage;
