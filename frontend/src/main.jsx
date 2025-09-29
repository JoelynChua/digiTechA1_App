import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "../screens/homepage.jsx";
import SeasonRecommendation from "../screens/seasonRecommendation.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/*" element={<HomePage />} />
      <Route path="/season-recommendation" element={<SeasonRecommendation />} />
    </Routes>
  </BrowserRouter>
);
