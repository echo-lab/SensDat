import React, { useEffect, useReducer, useState } from "react";
import ReactDOM from "react-dom";

import "react-reflex/styles.css"; // Resizable container
import { ReflexContainer, ReflexSplitter, ReflexElement } from "react-reflex";

import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";

import "./styles/index.css";
import { DataView } from "./data-view.js";
import { VizView } from "./viz-view.js";
import { StateView } from "./state-view.js";
import { UploadDataWidget } from "./upload-data.js";
import { UserStudyLoader } from "./preload/user-study";
import { CompoundStatePane } from "./compound-state-pane.js";
import { UIState } from "./ui-state.js";
import * as AppState from "./app-state.js";
import { ExportButton } from "./json_to_csv";
import { ClassExerciseLoader } from "./preload/class-exercise";
import { NavDropdown } from "react-bootstrap";
const MIN_HEIGHT = 700;

function App() {
  const [state, dispatch] = useReducer(AppState.reducer, AppState.initialState);
  const [uploadActive, setUploadActive] = useState(false);
  const [containerHeight, setContainerHeight] = useState(MIN_HEIGHT);

  // Load the previous data if it exists. Else, prompt the user for an upload.
  useEffect(
    () => {
      let serializedState = window.localStorage["state"];
      if (!serializedState) {
        setUploadActive(true);
        return;
      }
      AppState.deserialize(serializedState).then((deserializedState) =>
        dispatch(AppState.actions.loadState(deserializedState))
      );
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
    state.siteLayout,
    state.stateSequence,
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
    siteLayout: state.siteLayout,
    setContainerHeight: (x) => setContainerHeight(Math.max(x, MIN_HEIGHT)),
    dispatch,
  };

  let dataViewProps = {
    dataTable: state.dataTable,
    uistate: state.uiState,
    summaryTables: state.summaryTables,
    stateSequence: state.stateSequence,
    activeTab: state.activeTab,
    userDefinedStates: state.userDefinedStates,
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
        <Navbar.Brand>SensDat</Navbar.Brand>
        <Nav className="justify-content-end">
          <NavDropdown className="no-arrow" title="Import Data">
            <NavDropdown.Item onClick={() => setUploadActive(true)}>
              Upload CSV
            </NavDropdown.Item>
            <ClassExerciseLoader dispatch={dispatch} />
          </NavDropdown>
          {window.location.href.endsWith("/study") ? (
            <>
              <Navbar.Text>|</Navbar.Text>
              <UserStudyLoader dispatch={dispatch} />
            </>
          ) : (
            <>
              <Navbar.Text>|</Navbar.Text>
              <ExportButton {...state}></ExportButton>
            </>
          )}
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
        <div className="main-container" style={{ height: containerHeight }}>
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
