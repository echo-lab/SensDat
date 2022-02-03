import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { DataView } from "./data-view.js";
import { VizView } from "./viz-view.js";
import { DataTable } from "./data-table.js";


function App() {
  // TODO: eventually we need a map from tableName -> dataTable
  const [dataTable, setDataTable] = useState(undefined);
  const [vizTimespan, setVizTimespan] = useState([0, 100]);

  useEffect(
    () => {
      DataTable.FromTestData().then(dt => {
        console.log("setting data to: ", dt);
        setDataTable(dt);
      });
    },
    /*dependencies=*/ []
  );

  return (
    <div className="sensdat-container">
      <VizView dataTable={dataTable} vizTimespan={vizTimespan} onSliderChange={setVizTimespan}/>
      <div className="state-container debug"></div>
      <DataView dataTable={dataTable} />
      <div className="tables-container debug"></div>
    </div>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

