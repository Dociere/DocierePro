import React from "react";
import OverleafEditor from "./editorPage";

const CanvasPage = () => {
  return (
    <>
      <div>
        {/* <textarea
        className="border rounded p-2 w-full mt-4"
        rows={6}
        placeholder="Type here..."
      /> */}
        <OverleafEditor />
      </div>
    </>
  );
};

export default CanvasPage;
