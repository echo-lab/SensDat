import { UIState } from "./ui-state.js";
import { CreateRegionInteraction } from "./create-region-interaction.js";
import { DataTable } from "./data-table.js";
import * as LZString from "lz-string";
import { objectToState } from "./utils.js";

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
  summaryTables: [],
  uiState: UIState.NotLoaded,

  // User-defined states
  userDefinedStates: [],
  tmpUserDefinedState: null,

  // Interactions :D
  createRegionInteraction: null,

  // Active filters, like: columns which are hidden, states
  // which are visible, datapoints which are highlighted, etc.
  // TODO: add more as they're implemented.
  vizState: {
    timespan: [0, 100],
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
    userDefinedStates: state.userDefinedStates.map(s=>s.asObject()),
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
    console.log("No state to load")
    return state;
  }

  cleanupInteractions(state);  // in case we're in the middle of something
  let data = JSON.parse(LZString.decompress(serializedState));
  return {
    ...initialState,
    dataTable: DataTable.fromObject(data.dataTable),
    userDefinedStates: data.userDefinedStates.map(o=>objectToState(o)),
    uiState: UIState.Default,
  };
}

// payload: a valid DataTable object.
actionHandlers["loadTable"] = (state, payload) => {
  return {
    ...state,
    dataTable: payload,
    uiState: UIState.Default,
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

actionHandlers["startCreateRegion"] = (state, {dispatch}) => {
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

actionHandlers["createTempState"] = (state, {userDefinedState}) => {
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
    userDefinedStates: state.userDefinedStates.concat(state.tmpUserDefinedState),
    tmpUserDefinedState: null,
    createRegionInteraction: null,
    dataTable: state.dataTable.withCommittedTempState(),
    uiState: UIState.Default,
  };
};

actionHandlers["createSummary"] = (state, stateID) => {
  // See if the summary already exists.
  // TODO: switch to that tab if it does :)
  let existingSummary = state.summaryTables.find(st=>st.state.id === stateID);
  if (existingSummary) {
    return state;
  }

  // Find the state w/ the given ID
  let uds = state.userDefinedStates.find(s=>s.id === stateID);
  if (!uds) return state;
  state.summaryTables.push({state: uds, summaryTable: null});

  return {
    ...state
  };
};

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
