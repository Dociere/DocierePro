import React from "react";
import SideBar from "../components/sideBar";
import SectionSpace from "../components/sectionSpace";
import NavBar from "../components/navBar";
import { Outlet } from "react-router-dom";
import StatusBar from "../components/statusBar";
import { useState } from "react";

const PageLayout = () => {
  const [isSectionSpaceOpen, setIsSectionSpaceOpen] = useState(false);
  return (
    <>
      <NavBar />
      <div className="flex flex-row">
        <div>
          <SideBar
            isSectionSpaceOpen={isSectionSpaceOpen}
            setIsSectionSpaceOpen={setIsSectionSpaceOpen}
          />
        </div>
        <div>{isSectionSpaceOpen && <SectionSpace />}</div>
        <div className="w-full h-auto">
          <Outlet context={{ isSectionSpaceOpen }} />
        </div>
      </div>
      <StatusBar />
    </>
  );
};

export default PageLayout;
