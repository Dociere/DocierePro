import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PageLayout from "./layout/pageLayout";
import StartingPage from "./pages/startingPage";
import DetailsPage from "./pages/detailsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<PageLayout />}>
        <Route path="/" element={<StartingPage />} />
        <Route path="/detailPage" element={<DetailsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
