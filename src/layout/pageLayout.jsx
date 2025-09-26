import React from "react";
import SideBar from "../components/sideBar";
import NavBar from "../components/navBar";
import { Outlet } from "react-router-dom";

const PageLayout = () => {
  return (
    <>
      <NavBar />
      <div className="flex flex-row pr-5">
        <div className="mr-4">
          <SideBar />
        </div>
        <div className="mt-20 mb-5">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default PageLayout;
