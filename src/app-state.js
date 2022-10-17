import { UIState } from "./ui-state.js";
import { CreateRegionInteraction } from "./create-region-interaction.js";
import { DataTable } from "./data-table.js";
import * as LZString from "lz-string";
import {
  objectToState,
  getDependentStates,
  getDefaultDataTransform,
} from "./utils.js";
import { EditBox } from "./edit-box.js";

/*
 * This file provides a way to organize the app state that is shared across components.
 * The strategy is to use the `Flux` architecture, along with React's useReducer.
 *
 * How does it all work?
 * ---------------------
 *
 * In the highest-level component, we should do:
 *   const [state, dispatch] = React.useReducer(initialState, reducer);
 * Here, 'initialState' and 'reducer' are defined in this file.
 *
 * To use the state, we can just access 'state', which is initially set to 'initialState'.
 *
 * To update the state, we need to dispatch an action. This can be done like:
 *   dispatch({type: "loadTable", payload: myDataTable});
 * as an example. I included an export `actions` which allows you to instead do:
 *   dispatch(actions.loadtable(myDataTable));
 * which is equivalent.
 *
 *
 * How to update?
 * -------------------
 *
 * Adding to the state/changing the schema?
 *   -> update initialState and any previous actions that might change it.
 * Adding a new action?
 *   -> give it a name and add a new actionHandler
 *
 *
 * Caveats
 * -------
 * State that is NOT needed across multiple components does NOT need to live here.
 * For example, current form values, etc.
 */

export const initialState = {
  // Eventually, we'll want a map from tableName: table.
  dataTable: undefined,
  summaryTables: [], // [{state}, ...]
  uiState: UIState.NotLoaded,

  // Data transformations from Lat/Long -> SVG-space.
  defaultDataTransform: undefined,
  currentDataTransform: undefined,

  // User-defined states
  userDefinedStates: [], // list of state objects
  tmpUserDefinedState: null,

  // Interactions :D
  createRegionInteraction: null,

  // Which tab is active in the Data Pane. Either "BASE_TABLE" or a state ID.
  activeTab: "BASE_TABLE",

  // Active filters, like: columns which are hidden, states
  // which are visible, datapoints which are highlighted, etc.
  // TODO: add more as they're implemented.
  vizState: {
    dataPoints: null, // This should be updated only when new data is loaded!
    timespan: [0, 1e15],
    shownPoints: [-1, -1],
    highlightedPoints: null,
  },
};

/* Helper functions */

function cleanupInteractions(state) {
  state.createRegionInteraction && state.createRegionInteraction.cleanup();
}

export function serialize(state) {
  // Only need to save: dataTable, userDefinedStates
  if (!state.dataTable) return "";

  let res = {
    dataTable: state.dataTable.asObject(),
    userDefinedStates: state.userDefinedStates.map((s) => s.asObject()),
    summaryTables: state.summaryTables.map(({ state }) => state.asObject()),
    defaultDataTransform:
      state.defaultDataTransform && state.defaultDataTransform.asObject(),
    currentDataTransform:
      state.currentDataTransform && state.currentDataTransform.asObject(),
  };
  return LZString.compress(JSON.stringify(res));
}

/*
 * ACTION HANDLERS
 * Consider: moving this to it's own file; using Immer if the {...state} type updates become too cumbersome.
 */
let actionHandlers = {};

actionHandlers["loadState"] = (state, serializedState) => {
  if (!serializedState) {
    console.log("No state to load");
    return state;
  }

  cleanupInteractions(state); // in case we're in the middle of something
  let data = JSON.parse(LZString.decompress(serializedState));
  let table = DataTable.fromObject(data.dataTable);
  if (!table.isReady()) return state; // If it ain't good, don't load it!

  let vizData = table.getVizData();
  // The defaultTransform might not be set, e.g., if saved data is from a previous code version.
  let defaultTransform = data.defaultDataTransform
    ? EditBox.fromObject(data.defaultDataTransform)
    : getDefaultDataTransform(vizData);

  return {
    ...initialState,
    dataTable: table,
    userDefinedStates: data.userDefinedStates.map((o) => objectToState(o)),
    uiState: UIState.Default,
    summaryTables: data.summaryTables.map((s) => ({ state: objectToState(s) })),
    vizState: {
      ...initialState.vizState,
      dataPoints: vizData,
    },
    defaultDataTransform: defaultTransform,
    currentDataTransform: data.currentDataTransform
      ? EditBox.fromObject(data.currentDataTransform)
      : defaultTransform,
  };
};

// table: a valid DataTable object.
// Note: we throw out the old state here :)
actionHandlers["loadTable"] = (state, table) => {
  if (!table.isReady()) {
    throw "Table not ready for use!";
  }
  let vizData = table.getVizData();
  let transform = getDefaultDataTransform(vizData);
  return {
    ...initialState, // Reset to the original state
    dataTable: table,
    uiState: UIState.Default,
    vizState: {
      ...initialState.vizState,
      dataPoints: vizData,
    },
    defaultDataTransform: transform,
    currentDataTransform: transform,
  };
};

actionHandlers["changeTimespan"] = (state, payload) => {
  return {
    ...state,
    vizState: {
      ...state.vizState,
      timespan: payload,
    },
  };
};

actionHandlers["startEditData"] = (state) => {
  return {
    ...state,
    uiState: UIState.MoveDataPoints,
  };
};

actionHandlers["cancelEditData"] = (state) => {
  return {
    ...state,
    uiState: UIState.Default,
  };
};

actionHandlers["finishEditData"] = (state, transform) => {
  return {
    ...state,
    uiState: UIState.Default,
    currentDataTransform: transform,
  };
};

actionHandlers["startCreateRegion"] = (state, { dispatch }) => {
  return {
    ...state,
    uiState: UIState.CreateRegion,
    createRegionInteraction: new CreateRegionInteraction(dispatch),
  };
};

actionHandlers["cancelCreateRegion"] = (state, payload) => {
  cleanupInteractions(state);
  return {
    ...state,
    uiState: UIState.Default,
    tmpUserDefinedState: null,
    createRegionInteraction: null,
    dataTable: state.dataTable.withoutTempState(),
  };
};

actionHandlers["startCreateCompoundState"] = (state, payload) => {
  return {
    ...state,
    uiState: UIState.CreateCompound,
  };
};

actionHandlers["cancelCreateCompoundState"] = (state, payload) => {
  return {
    ...state,
    uiState: UIState.Default,
  };
};

actionHandlers["createCompoundState"] = (state, compoundState) => {
  return {
    ...state,
    userDefinedStates: state.userDefinedStates.concat(compoundState),
    dataTable: state.dataTable
      .withTempState(compoundState)
      .withCommittedTempState(),
    uiState: UIState.Default,
  };
};

actionHandlers["createTempState"] = (state, { userDefinedState }) => {
  // return a new DataTable with the temp state column.
  // Note: clobbers any existing temp columns (!)
  return {
    ...state,
    tmpUserDefinedState: userDefinedState,
    dataTable: state.dataTable.withTempState(userDefinedState),
  };
};

actionHandlers["commitTempState"] = (state, payload) => {
  cleanupInteractions(state);
  // return a new DataTablewith the temp columns committed!
  return {
    ...state,
    userDefinedStates: state.userDefinedStates.concat(
      state.tmpUserDefinedState
    ),
    tmpUserDefinedState: null,
    createRegionInteraction: null,
    dataTable: state.dataTable.withCommittedTempState(),
    uiState: UIState.Default,
  };
};

actionHandlers["deleteState"] = (state, userState) => {
  let toDelete = [
    userState,
    ...getDependentStates(userState, state.userDefinedStates),
  ];
  let toDeleteIDs = toDelete.map((s) => s.id);

  return {
    ...state,
    activeTab: toDeleteIDs.includes(state.activeTab)
      ? "BASE_TABLE"
      : state.activeTab,
    userDefinedStates: state.userDefinedStates.filter(
      (s) => !toDeleteIDs.includes(s.id)
    ),
    summaryTables: state.summaryTables.filter(
      (t) => !toDeleteIDs.includes(t.state.id)
    ),
    dataTable: state.dataTable.withDeletedStates(toDelete),
  };
};

actionHandlers["createSummary"] = (state, stateID) => {
  // See if the summary already exists.
  let existingSummary = state.summaryTables.find(
    (st) => st.state.id === stateID
  );
  if (existingSummary) {
    return {
      ...state,
      activeTab: stateID,
    };
  }

  // Find the state w/ the given ID
  let uds = state.userDefinedStates.find((s) => s.id === stateID);
  if (!uds) return state;

  return {
    ...state,
    activeTab: stateID,
    summaryTables: [...state.summaryTables, { state: uds }],
  };
};

actionHandlers["selectTab"] = (state, tabID) => ({
  ...state,
  activeTab: tabID,
});

actionHandlers["setShownPoints"] = (state, shownRange) => ({
  ...state,
  vizState: {
    ...state.vizState,
    shownPoints: shownRange,
  },
});

actionHandlers["highlightPoints"] = (state, pointsRange) => ({
  ...state,
  vizState: {
    ...state.vizState,
    highlightedPoints: pointsRange,
  },
});

actionHandlers["highlightPointsForState"] = (state, userState) => ({
  ...state,
  vizState: {
    ...state.vizState,
    highlightedPoints: state.dataTable.getTrueRanges(userState.id),
  },
});

// actions maps each actionHandler name (e.g., "loadTable", "changeTimespan") to a function
// which takes a payload and returns an action object which can be used w/ React's `dispatch`
// function. So: you can do something like: dispatch(actions.loadTable(myTable));
export const actions = Object.keys(actionHandlers).reduce((prev, action) => {
  prev[action] = (payload) => ({
    type: action,
    payload,
  });
  return prev;
}, {});

export function reducer(state, action) {
  return actionHandlers[action.type](state, action.payload);
}
