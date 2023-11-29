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



    // <div className="Tutorial">
    //   <div className="Tutorial-text">
    //     <div className="Tutorial-left">
    //       <h1 className="Tutorial-title">Tutorial</h1>
    //     </div>
    //   </div>
    //   <div className="Tutorial-right">
    //     <div className="Tutorial-frame">
    //       <iframe
    //         width="900"
    //         height="600"
    //         src=""
    //         title="Octave Tutorial"
    //         frameBorder="0"
    //         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    //         allowFullScreen
    //       ></iframe>
    //     </div>
    //   </div>

    // </div>




  );
};

export default About;
