import React from "react";
import SideBar from "../components/sideBar";
import NavBar from "../components/navBar";
import { Outlet } from "react-router-dom";
import StatusBar from "../components/statusBar";

const PageLayout = () => {
  return (
    <>
      <NavBar />
      <div className="flex flex-row">
        <div className="mr-14">
          <SideBar />
        </div>
        <div className="w-full h-auto mt-10">
          <Outlet />
        </div>
      </div>
      <StatusBar />
    </>
  );
};

export default PageLayout;
