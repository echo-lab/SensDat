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
import { UserStudyLoader } from "./user-study";
import { CompoundStatePane } from "./compound-state-pane.js";
import { UIState } from "./ui-state.js";
import * as AppState from "./app-state.js";
import { ExportButton } from "./json_to_csv";
const MIN_HEIGHT = 700;

// This is the main place where everything starts. If you are doing any 
// development on this project, this is a good place to start to see how 
// everything is being rendered.
function App() {
  const [state, dispatch] = useReducer(AppState.reducer, AppState.initialState);
  const [uploadActive, setUploadActive] = useState(false);
  const [containerHeight, setContainerHeight] = useState(MIN_HEIGHT);

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
    window.localStorage["state"] = AppState.serialize(state);
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
        <Navbar.Brand>SensDat</Navbar.Brand>
        <Nav className="justify-content-end">
          <Nav.Link onClick={() => setUploadActive(true)}>Upload Data</Nav.Link>
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
