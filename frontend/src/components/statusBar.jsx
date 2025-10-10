import React from "react";

const StatusBar = () => {
  return (
    <>
      <div className="w-screen z-30 h-5 fixed bottom-0 bg-[#F9F9F9] border-[#CFCFCF] border-[1.5px]">
        <div className="flex flex-row text-[#9095A1] ml-5 text-[0.9vw] gap-5">
          <p>Online</p>
          <p>Sync</p>
        </div>
      </div>
    </>
  );
};

export default StatusBar;
