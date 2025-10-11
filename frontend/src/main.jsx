import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ProjectProvider } from "./context/useProject.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </BrowserRouter>
);
