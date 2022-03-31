import React, { useState, useEffect, useReducer } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { DataView } from "./data-view.js";
import { VizView } from "./viz-view.js";
import { StateView } from "./state-view.js";
import { DataTable } from "./data-table.js";
import { UIState } from "./ui-state.js";
import * as AppState from "./app-state.js";

function App() {
  const [state, dispatch] = useReducer(AppState.reducer, AppState.initialState);

  useEffect(
    () => {
      DataTable.FromTestData().then((dt) => {
        console.log("setting data to: ", dt);
        // setDataTable(dt);
        dispatch(AppState.actions.loadTable(dt));
      });
    },
    /*dependencies=*/ []
  );

  let stateViewProps = {
    uiState: state.uiState,
    createStateValid: state.createStateValid,
    dispatch,
  };

  let vizViewProps = {
    dataTable: state.dataTable,
    dispatch,
    vizTimespan: state.vizState.timespan,
    uistate: state.uiState,
  };

  let modalHidden = state.uiState === UIState.Default || state.uiState === UIState.NotLoaded;

  return (
    <div className="sensdat-container">
      <VizView {...vizViewProps} />
      <StateView {...stateViewProps}/>
      <DataView dataTable={state.dataTable} uistate={state.uiState} />
      <div className="tables-container debug"></div>
      <div className="modal-background" hidden={modalHidden}></div>
    </div>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
