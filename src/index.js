import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { DataView } from "./data-view.js";
import { VizView } from "./viz-view.js";
import { StateView } from "./state-view.js";
import { DataTable } from "./data-table.js";
import { UIState } from "./ui-state.js";

function App() {
  // TODO: eventually we need a map from tableName -> dataTable
  const [dataTable, setDataTable] = useState(undefined);
  const [vizTimespan, setVizTimespan] = useState([0, 100]);
  const [uistate, setUistate] = useState(UIState.Default);

  useEffect(
    () => {
      DataTable.FromTestData().then((dt) => {
        console.log("setting data to: ", dt);
        setDataTable(dt);
      });
    },
    /*dependencies=*/ []
  );

  let stateViewProps = {
    uiState: uistate,
    handleCreateRegion: ()=>setUistate(UIState.CreateRegion),
    handleCancel: ()=>setUistate(UIState.Default),
  };

  let vizViewProps = {
    dataTable,
    vizTimespan,
    uistate,
    onSliderChange: setVizTimespan,
  };

  return (
    <div className="sensdat-container">
      <VizView {...vizViewProps} />
      <StateView {...stateViewProps}/>
      <DataView dataTable={dataTable} />
      <div className="tables-container debug"></div>
      <div className="modal-background" hidden={uistate===UIState.Default}></div>
    </div>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
