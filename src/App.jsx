import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import PageLayout from "./layout/pageLayout";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      {/* <Route path="/" element={<PageLayout />}>
        <Route
          path="/home/carousel"
          element={
            <PrivateRoute permission="home_page">
              <ImgCarousel />
            </PrivateRoute>
          }
        />
      </Route> */}
      <PageLayout />
    </>
  );
}

export default App;
