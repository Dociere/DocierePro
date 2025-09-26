import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PageLayout from "./layout/pageLayout";
import StartingPage from "./pages/startingPage"; // Capitalized

function App() {
  return (
    <Routes>
      <Route path="/" element={<PageLayout />}>
        <Route index element={<StartingPage />} />
      </Route>
    </Routes>
  );
}

export default App;
