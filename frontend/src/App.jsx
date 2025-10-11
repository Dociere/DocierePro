import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PageLayout from "./layout/pageLayout";
import StartingPage from "./pages/startingPage";
import TemplateSelect from "./pages/templateSelect";
import DetailsPage from "./pages/detailsPage";
import CanvasPage from "./pages/canvasPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<PageLayout />}>
        <Route path="/" element={<StartingPage />} />
        <Route path="/template" element={<TemplateSelect />} />
        <Route path="/detailPage/:templateTitle" element={<DetailsPage />} />
        <Route path="/canvas" element={<CanvasPage />} />
      </Route>
    </Routes>
  );
}

export default App;
