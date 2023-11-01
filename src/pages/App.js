import * as React from "react";
import { Navigate } from "react-router";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/header";
import Home from "./home/home-page";
import About from "./about/about-page";
import SpatialTemporal from "./spatial-temporal/spatial-temporal";

const App = () => {
  const buildPage = (page) => (
    <div className="Page">
        <Header />
        {page}
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={buildPage(<Home />)} />
        <Route path="/home" element={buildPage(<Home />)} />
        <Route path="/about" element={buildPage(<About />)} />
        <Route path="/spatial-temporal" element={buildPage(<SpatialTemporal />)} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
