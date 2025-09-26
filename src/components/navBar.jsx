import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const NavBar = () => {
  return (
    <>
      <div className="z-10 fixed w-full">
        <div className="bg-[#F9F9F9] h-10 w-full top-[3px] bottom-0 border-b-[0.5px] border-[#CFCFCF]"></div>
      </div>
    </>
  );
};

export default NavBar;
