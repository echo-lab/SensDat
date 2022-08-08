import React, { useEffect, useReducer, useState } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { DataView } from "./data-view.js";
import { VizView } from "./viz-view.js";
import { StateView } from "./state-view.js";
import { UploadDataWidget } from "./upload-data.js";
import { CompoundStatePane } from "./compound-state-pane.js";
import { UIState } from "./ui-state.js";
import * as AppState from "./app-state.js";

import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

import 'react-reflex/styles.css';
import {
  ReflexContainer,
  ReflexSplitter,
  ReflexElement
} from 'react-reflex'


function App() {
  const [state, dispatch] = useReducer(AppState.reducer, AppState.initialState);
  const [uploadActive, setUploadActive] = useState(false);

  // Load the previous data if it exists. Else, load the test data.
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
  useEffect(() => {
    window.localStorage["state"] = AppState.serialize(state);
    console.log("saved state");
  }, [state.dataTable, state.summaryTables, state.userDefinedStates]);

  // Allow printing the current state for debugging.
  useEffect(
    () => {
      let onKeypress = (e) => {
        if (!e.altKey) return;
        if (e.code === "KeyD") {
          console.log("Deleting saved state");
          window.localStorage.removeItem("state");
        }
        if (e.code === "KeyP") {
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
    shownPoints: state.vizState.shownPoints,
    useShownPoints: state.activeTab === "BASE_TABLE",
    highlightedPoints: state.vizState.highlightedPoints,
    uistate: state.uiState,
    createRegionInteraction: state.createRegionInteraction,
    userDefinedStates: state.userDefinedStates,
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
    dispatch
  };

  let uploadDataProps = {
    onCancel: ()=>setUploadActive(false),
    dispatch,
  };

  // let modalHidden = state.uiState === UIState.Default || state.uiState === UIState.NotLoaded;

  let PageHeader = () => (
    <Navbar className="bg-top-nav" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand >Octave</Navbar.Brand>
          <Nav className="justify-content-end">
            <Nav.Link onClick={()=>setUploadActive(true)}>
              Upload Data
            </Nav.Link>
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
      <ReflexSplitter/>
      <ReflexElement className="right-pane"
        minSize="100"
        propagateDimensions={true}
        propagateDimensionsRate={200}
      >
        {
            state.uiState !== UIState.CreateCompound ?
            <DataView {...dataViewProps} /> :
            <CompoundStatePane {...compoundStatePaneProps} />
        }
      </ReflexElement>
    </ReflexContainer>
    </div>
    </Container>
    {
      uploadActive ? (
        <UploadDataWidget {...uploadDataProps} />
      ) : null
    }
    </>
    );
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
