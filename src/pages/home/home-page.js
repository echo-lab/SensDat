import * as React from "react";
import "../../styles/home/home-page.css";
import "../../styles/about/about-page.css";

const Home = () => {
  return (
    <div className="Home">
      <div className="Home-left">
        <div className="Home-text">
          <h1 className="Home-title">Welcome to Octave!</h1>
          <div className="Home-description">
            Octave is a website aimed at allowing you to create Observable
            Connections between Tables Algorithms and Visualizations! 
            Octave is designed to assist you in analyzing spatiotemporal data,
             like GPS sensor data, in an interactive, user-friendly manner.
            It features an accessible interface combining a visualization pane 
            with a data pane, and a state toolbar for managing various data states. <br /><br />
            Here is a Tutorial Video on how to use the site!
          </div>

        </div>
        <div className="Tutorial-frame">
          <iframe
            width="900"
            height="600"
            src="https://www.youtube.com/embed/vhyXE58cv0Y"
            title="Octave Video Abstract"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen />
        </div>
      </div>
      <div className="Home-right">
        <div className="Paper-container">
            <h2 className="Paper-title"> 
            <a href="https://ieeexplore.ieee.org/abstract/document/10305646">
            Paper </a>
            </h2>
          <div className="Paper-line" />
          <div className="Paper">
            <iframe 
              src="https://docs.google.com/document/d/e/2PACX-1vSKGMUDbIZEWPHBH50wfH41Mu4jB5y0vrUHuL0Oyq-LvIxC5tufF-pCjZQxZQu9_Vp7pIJphajz96x3/pub?embedded=true"
              type="application/pdf"
              title="Octave paper"
              width="800"
              height="500">
            </iframe>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
