import * as React from "react";
import "../../styles/about/about-page.css";

const About = () => {
  return (
    <div className="About">
      <div className="About-left">
        <h1 className="About-title">About Octave</h1>
        <div className="About-description">
          Octave is a website aimed at allowing you to create Observable
          Connections between Tables Algorithms and Visualizations!
        </div>
      </div>
      <div className="About-right">
        <div className="Paper-container">
        <h2 className="Paper-title">Paper</h2>
        <div className="Paper-line" />
        <div className="Paper">

        </div>
        
        </div>
      </div>
    </div>
  );
};

export default About;
