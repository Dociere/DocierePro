import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ProjectProvider } from "./context/useProject.jsx";
import { AuthProvider } from "./context/useAuth.jsx";
import { SettingsProvider } from "./context/useSettings.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <SettingsProvider>
        <ProjectProvider>
          <App />
        </ProjectProvider>
      </SettingsProvider>
    </AuthProvider>
  </BrowserRouter>
);
