// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import PageLayout from "./layout/pageLayout";
import StartingPage from "./pages/startingPage";
import TemplateSelect from "./pages/templateSelect";
import DetailsPage from "./pages/detailsPage";
import CanvasPage from "./pages/canvasPage";
import TemplateBuilderPage from "./pages/TemplateBuilderPage";
import Signup from "./pages/User_Account/signup";
import Login from "./pages/User_Account/login";
import SettingsPage from "./pages/settingsPage";
import TemplatePreview from "./pages/templatePreview";
import TemplateBrowse from "./pages/templateBrowse";

function App() {
  return (
    <Routes>
      <Route path="/" element={<PageLayout />}>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<StartingPage />} />
        <Route path="/template" element={<TemplateSelect />} />
        <Route
          path="/template/preview/:templateKey"
          element={<TemplatePreview />}
        />
        <Route path="/template/browse" element={<TemplateBrowse />} />
        <Route path="/template/builder" element={<TemplateBuilderPage />} />
        <Route path="/detailPage/:templateTitle" element={<DetailsPage />} />
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
