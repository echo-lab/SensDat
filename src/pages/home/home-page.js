import * as React from "react";
import "../../styles/home/home-page.css";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="Home">
      <div className="Home-text">
        <h1 className="Home-title">Welcome to Octave!</h1>
        <div className="Home-description">
          Octave is a website aimed at allowing you to create Observable
          Connections between Tables Algorithms and Visualizations! Here is a
          Tutorial Video on how to use the site!
        </div>
      </div>

    </div>
  );
};

{/* <iframe
          width="900"
          height="600"
          src=""
          title="Octave Tutorial"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe> */}
        {/* <div className="Home-right">
        <Link className="Home-spatialTemporalButton" to="/spatial-temporal">
          Check Out Octave Here!
        </Link>
        <Link className="Home-spatialTemporalButton" to="/about">
          About
        </Link>
      </div> */}

export default Home;
