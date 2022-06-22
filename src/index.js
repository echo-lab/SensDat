import React, { useEffect, useReducer } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { DataView } from "./data-view.js";
import { VizView } from "./viz-view.js";
import { StateView } from "./state-view.js";
import { SummaryView } from "./summary-view.js";
import { DataTable } from "./data-table.js";
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
        if (!e.altKey) return;
        if (e.code === "KeyS") {
          console.log("Saving state");
          window.localStorage["state"] = AppState.serialize(state);
        }
        if (e.code === "KeyL") {
          console.log("Loading state");
          let serializedState = window.localStorage["state"];
          dispatch(AppState.actions.loadState(serializedState));
        }
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

  let summaryViewProps = {
    userDefinedStates: state.userDefinedStates,
    dispatch,
  };

  let modalHidden = state.uiState === UIState.Default || state.uiState === UIState.NotLoaded;

  let PageHeader = () => (
    <Navbar bg="light" expand="lg">
      <Container>
        <Navbar.Brand >Octave</Navbar.Brand>
          <Nav className="justify-content-end">
            <Nav.Link> Upload Data </Nav.Link>
            <Navbar.Text>|</Navbar.Text>
            <Nav.Link> New State </Nav.Link>
            <Navbar.Text>|</Navbar.Text>
            <Nav.Link> Existing States </Nav.Link>
            <Navbar.Text>|</Navbar.Text>
            <Nav.Link> Create Summary </Nav.Link>
          </Nav>
      </Container>
    </Navbar>
  );

  return (
    <>
    <PageHeader />
    <Container bg="light">
    <StateView {...stateViewProps} />
    </Container>

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
      >
        <DataView {...dataViewProps} />
      </ReflexElement>
    </ReflexContainer>
    </div>
    </>
    );
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
