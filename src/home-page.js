import * as React from "react";

import "./home-page.css";

const Home = () => {
  return (
    <div className="Home">
      <div className="Home-left">
        <h1 className="Home-title">Welcome to Octave!</h1>
        <div className="Home-description">
          Octave is a website aimed at allowing you to create Observable
          Connections between Tables Algorithms and Visualizations! Here is a
          Tutorial Video on how to use the site!
        </div>
        <iframe
          width="900"
          height="600"
          src=""
          title="Octave Tutorial"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
      <div className="Home-right">
        <a className="Home-spatialTemporalButton" href="spatial-temporal">
          Check Out Octave Here!
        </a>
      </div>
    </div>
  );
};

export default Home;
