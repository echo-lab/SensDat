import React, { useEffect, useReducer, useState, useMemo } from "react";
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
import { ConditionStatePane } from "./condition-state-pane.js"
import { UserStudyLoader } from "./preload/user-study";
import { CompoundStatePane } from "./compound-state-pane.js";
import { UIState } from "./ui-state.js";
import * as AppState from "./app-state.js";
import { ExportButton } from "./json_to_csv";
import { ClassExerciseLoader } from "./preload/class-exercise";
import { NavDropdown } from "react-bootstrap";
import { DataRecorder } from "./data-recorder";
import { SequenceStatePane } from "./sequence-state-pane";

const MIN_HEIGHT = 700;

// If RECORD_DATA_MODE is set to true, then you can click around the map and then enter
// option+O (on a mac) to export CSV of the points you clicked.
const RECORD_DATA_MODE = false;
const RECORD_DATA_START_TIME = new Date(
  new Date().getTime() - 365 * 24 * 60 * 60 * 1000
); // a year ago lol
const RECORD_DATA_DT = 5; // number of seconds between data points

// This is the main place where everything starts. If you are doing any 
// development on this project, this is a good place to start to see how 
// everything is being rendered.

function App() {
  const [state, dispatch] = useReducer(AppState.reducer, AppState.initialState);
  const [uploadActive, setUploadActive] = useState(false);
  const [containerHeight, setContainerHeight] = useState(MIN_HEIGHT);

  const dataRecorder = useMemo(() => new DataRecorder(RECORD_DATA_DT), []); // no deps!

  // Load the previous data if it exists. Else, prompt the user for an upload.
  // Currently takes advantage of using localstorage to store the most recent
  // instance of the site.
  useEffect(
    () => {

      // Stores the last instance of the site from local storage.
      let serializedState = window.localStorage["state"];

      // If there is not a last instance, it prompts the user to upload data.
      if (!serializedState) {
        setUploadActive(true);
        return;
      }

      // If there is a last instance, than it deserializes it and displays it 
      // on the site.
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
    window.localStorage["state"] = AppState.serialize({
      dataTable: state.dataTable,
      summaryTables: state.summaryTables,
      userDefinedStates: state.userDefinedStates,
      defaultDataTransform: state.defaultDataTransform,
      currentDataTransform: state.currentDataTransform,
      siteLayout: state.siteLayout,
    });
    console.log("saved state");
  }, [
    state.dataTable,
    state.summaryTables,
    state.userDefinedStates,
    state.defaultDataTransform,
    state.currentDataTransform,
    state.siteLayout,
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
        } else if (e.code === "KeyO") {
          RECORD_DATA_MODE &&
            dataRecorder.exportPoints(RECORD_DATA_START_TIME, RECORD_DATA_DT);
        }
      };

      document.addEventListener("keydown", onKeypress);
      return () => document.removeEventListener("keydown", onKeypress);
    },
    /*dependencies=*/ [state, dataRecorder]
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
      state.activeTab === "BASE_TABLE" && state.uiState.shouldShowPoints(),
    highlightedPoints: state.vizState.highlightedPoints,
    uistate: state.uiState,
    createRegionInteraction: state.createRegionInteraction,
    userDefinedStates: state.userDefinedStates,
    defaultTransform: state.defaultDataTransform,
    currentTransform: state.currentDataTransform,
    uiState: state.uiState,
    siteLayout: state.siteLayout,
    setContainerHeight: (x) => setContainerHeight(Math.max(x, MIN_HEIGHT)),
    dataRecorder: RECORD_DATA_MODE && dataRecorder,
    dispatch,
  };

  let dataViewProps = {
    dataTable: state.dataTable,
    uiState: state.uiState,
    summaryTables: state.summaryTables,
    activeTab: state.activeTab,
    userDefinedStates: state.userDefinedStates,
    dispatch,
    timeGraphDataTable: state.timeGraphDataTable,
  };

  let compoundStatePaneProps = {
    userDefinedStates: state.userDefinedStates,
    dataTable: state.dataTable,
    dispatch,
  };

  let conditionStatePaneProps = {
    userDefinedStates: state.userDefinedStates,
    dataTable: state.dataTable,
    dispatch,
  };
  
  let createSequenceProps = {
    userDefinedStates: state.userDefinedStates,
    dataTable: state.dataTable,
    dispatch,
  };

  let uploadDataProps = {
    onCancel: state.dataTable ? () => setUploadActive(false) : () => {},
    onDone: () => setUploadActive(false),
    dispatch,
  };

  // This could really be cleaned up...
  let exportButtonProps = {
    activeTab: state.activeTab,
    dataTable: state.dataTable,
    summaryTables: state.summaryTables,
    state,
    dispatch,
  };

  let PageHeader = () => (
    <Navbar className="bg-top-nav" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand>Octave</Navbar.Brand>
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
              <ExportButton {...exportButtonProps}></ExportButton>
            </>
          )}
        </Nav>
      </Container>
    </Navbar>
  );

  let renderRightPane = (uistate) => {
    if (uistate === UIState.CreateCompound) {
      return <CompoundStatePane {...compoundStatePaneProps} />;
    } else if (uistate === UIState.CreateSequence) {
      return <SequenceStatePane {...createSequenceProps} />;
    } else if (uistate === UIState.CreateCondition) {
      return <ConditionStatePane {...conditionStatePaneProps} />;
    } else {
      return <DataView {...dataViewProps} />;
    }
  };

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
              minSize="300"
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
              {renderRightPane(state.uiState)}
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
