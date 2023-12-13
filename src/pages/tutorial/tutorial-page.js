import * as React from "react";
import "../../styles/tutortial/tutorial-page.css";

const Tutorial = () => {
    return (
        <div className="Tutorial">
            <div className="Tutorial-text">
                <div className="Tutorial-left">
                    <h1 className="Tutorial-title">Tutorial</h1>
                    <div className="Tutorial-frame">
                        <iframe
                            title="Octave tutortial paper"
                            src="https://docs.google.com/document/d/e/2PACX-1vRLYsaV04CzVBEqTrV8dif1JTUzn0voP3jzVND4XczZtKV5Eo1mZFoKmuufSQPUyaUMGt1b6GuF2baQ/pub?embedded=true" />
                    </div>
                </div>
            </div>
        </div>
    );
};


export default Tutorial;
