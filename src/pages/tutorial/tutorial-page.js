import * as React from "react";
import "../../styles/tutortial/tutorial-page.css";

const Tutorial = () => {
    return (
        <div className="Tutorial">
            <div className="Tutorial-text">
                <div className="Tutorial-left">
                    <h1 className="Tutorial-title">Tutorial</h1>
                </div>
            </div>
            <div className="Tutorial-right">
                <div className="Tutorial-frame">
                    <iframe
                        width="900"
                        height="600"
                        src=""
                        title="Octave Tutorial"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    ></iframe>
                </div>
            </div>

        </div>
    );
};


export default Tutorial;
