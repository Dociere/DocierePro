import React from "react";
import SideBar from "../components/sideBar";
import NavBar from "../components/navBar";
import { Outlet } from "react-router-dom";

const PageLayout = () => {
  return (
    <>
      <NavBar />
      <div className="flex flex-row">
        <div className="mr-20">
          <SideBar />
        </div>
        <div className="mt-16 mb-5 mr-8">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default PageLayout;
