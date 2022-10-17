import React, { useEffect, useReducer, useState } from "react";
import ReactDOM from "react-dom";

import "react-reflex/styles.css"; // Resizable container
import { ReflexContainer, ReflexSplitter, ReflexElement } from "react-reflex";

import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";

import "./index.css";
import { DataView } from "./data-view.js";
import { VizView } from "./viz-view.js";
import { StateView } from "./state-view.js";
import { UploadDataWidget } from "./upload-data.js";
import { CompoundStatePane } from "./compound-state-pane.js";
import { UIState } from "./ui-state.js";
import * as AppState from "./app-state.js";

function App() {
  const [state, dispatch] = useReducer(AppState.reducer, AppState.initialState);
  const [uploadActive, setUploadActive] = useState(false);

  // Load the previous data if it exists. Else, prompt the user for an upload.
  useEffect(
    () => {
      let serializedState = window.localStorage["state"];
      serializedState
        ? dispatch(AppState.actions.loadState(serializedState))
        : setUploadActive(true);
    },
    /*dependencies=*/ []
  );

  // Auto-save whenever something changes.
  // TODO: Change dependency on state.dataTable to something more specific so
  // we don't save temporary states, e.g., in the middle of creating a region.
  useEffect(() => {
    window.localStorage["state"] = AppState.serialize(state);
    console.log("saved state");
  }, [
    state.dataTable,
    state.summaryTables,
    state.userDefinedStates,
    state.defaultDataTransform,
    state.currentDataTransform,
  ]);

  // Allow printing the current state for debugging.
  useEffect(
    () => {
      let onKeypress = (e) => {
        if (!e.altKey) return;
        if (e.code === "KeyD") {
          console.log("Deleting saved state");
          window.localStorage.removeItem("state");
        } else if (e.code === "KeyP") {
          console.log("Current state: ", state);
        }
      };

      document.addEventListener("keydown", onKeypress);
      return () => document.removeEventListener("keydown", onKeypress);
    },
    /*dependencies=*/ [state]
  );

  let stateViewProps = {
    uiState: state.uiState,
    userDefinedStates: state.userDefinedStates,
    tmpUserDefinedState: state.tmpUserDefinedState,
    createRegionInteraction: state.createRegionInteraction,
    dispatch,
  };

  let vizViewProps = {
    vizData: state.vizState.dataPoints,
    vizTimespan: state.vizState.timespan,
    shownPoints: state.vizState.shownPoints,
    useShownPoints:
      state.activeTab === "BASE_TABLE" &&
      state.uiState !== UIState.CreateCompound,
    highlightedPoints: state.vizState.highlightedPoints,
    uistate: state.uiState,
    createRegionInteraction: state.createRegionInteraction,
    userDefinedStates: state.userDefinedStates,
    defaultTransform: state.defaultDataTransform,
    currentTransform: state.currentDataTransform,
    uiState: state.uiState,
    dispatch,
  };

  let dataViewProps = {
    dataTable: state.dataTable,
    uistate: state.uiState,
    summaryTables: state.summaryTables,
    activeTab: state.activeTab,
    dispatch,
  };

  let compoundStatePaneProps = {
    userDefinedStates: state.userDefinedStates,
    dataTable: state.dataTable,
    dispatch,
  };

  let uploadDataProps = {
    onCancel: state.dataTable ? () => setUploadActive(false) : () => {},
    onDone: () => setUploadActive(false),
    dispatch,
  };

  let PageHeader = () => (
    <Navbar className="bg-top-nav" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand>Octave</Navbar.Brand>
        <Nav className="justify-content-end">
          <Nav.Link onClick={() => setUploadActive(true)}>Upload Data</Nav.Link>
          <Navbar.Text>|</Navbar.Text>
          <Nav.Link> Export Data </Nav.Link>
        </Nav>
      </Container>
    </Navbar>
  );

  return (
    <>
      <PageHeader />
      <Container fluid className="bg-doob">
        <Container>
          <StateView {...stateViewProps} />
        </Container>
      </Container>
      <Container fluid className="bg-light">
        <div className="main-container">
          <ReflexContainer orientation="vertical">
            <ReflexElement
              className="left-pane"
              flex={0.595}
              propagateDimensionsRate={200}
              propagateDimensions={true}
              minSize="500"
            >
              <VizView {...vizViewProps} />
            </ReflexElement>
            <ReflexSplitter />
            <ReflexElement
              className="right-pane"
              minSize="100"
              propagateDimensions={true}
              propagateDimensionsRate={200}
            >
              {state.uiState !== UIState.CreateCompound ? (
                <DataView {...dataViewProps} />
              ) : (
                <CompoundStatePane {...compoundStatePaneProps} />
              )}
            </ReflexElement>
          </ReflexContainer>
        </div>
      </Container>
      {uploadActive ? <UploadDataWidget {...uploadDataProps} /> : null}
    </>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
