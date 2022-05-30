import React, { useEffect, useReducer } from "react";
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

  // By default, load the test data.
  useEffect(
    () => {
      DataTable.FromTestData().then((dt) => {
        dispatch(AppState.actions.loadTable(dt));
      });
    },
    /*dependencies=*/ []
  );

  // Allow saving/loading/deleting/printing.
  useEffect(
    () => {
      let onKeypress = (e) => {
        if (e.key === "s") {
          console.log("Saving state");
          window.localStorage["state"] = AppState.serialize(state);
        }
        if (e.key === "l") {
          console.log("Loading state");
          let serializedState = window.localStorage["state"];
          dispatch(AppState.actions.loadState(serializedState));
        }
        if (e.key === "d") {
          console.log("Deleting saved state");
          window.localStorage.removeItem("state");
        }
        if (e.key === "p") {
          console.log("Current state: ", state);
        }
      };

      document.addEventListener("keydown", onKeypress);

      return () => document.removeEventListener("keydown", onKeypress);
    },
    /*dependencies=*/[state]
  )

  let stateViewProps = {
    uiState: state.uiState,
    userDefinedStates: state.userDefinedStates,
    tmpUserDefinedState: state.tmpUserDefinedState,
    dispatch,
    createRegionInteraction: state.createRegionInteraction,
  };

  let vizViewProps = {
    vizData: state.dataTable ? state.dataTable.vizData : null,
    dispatch,
    vizTimespan: state.vizState.timespan,
    uistate: state.uiState,
    createRegionInteraction: state.createRegionInteraction,
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
