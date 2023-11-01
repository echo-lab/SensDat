import * as React from "react";
import { Navigate } from "react-router";
import { HashRouter, Routes, Route } from "react-router-dom";
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
    <HashRouter basename="/" future={{ v7_startTransition: true }}>
      <Routes>
        <Route exact path="/home" element={buildPage(<Home />)} />
        <Route exact path="/about" element={buildPage(<About />)} />
        <Route
          exact
          path="/spatial-temporal"
          element={buildPage(<SpatialTemporal />)}
        />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
