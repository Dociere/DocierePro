import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchBar from "./searchBar";

const NavBar = () => {
  return (
    <>
      <div className="z-10 fixed w-full top-0">
        <div className="bg-[#F9F9F9] h-11 w-full top-[3px] bottom-0 border-b-[0.5px] border-[#CFCFCF] flex">
          <div className=" flex gap-7 mt-3 text-sm pl-5 text-[#212121]">
            <p>File</p>
            <p>Edit</p>
            <p>View</p>
            <p>Help</p>
          </div>
          <SearchBar />
        </div>
      </div>
    </>
  );
};

export default NavBar;
