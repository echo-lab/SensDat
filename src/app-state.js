import { UIState } from "./ui-state.js";

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
  uiState: UIState.NotLoaded,

  // User-defined states
  states: [],

  // Active filters, like: columns which are hidden, states
  // which are visible, datapoints which are highlighted, etc.
  // TODO: add more as they're implemented.
  vizState: {
    timespan: [0, 100],
  },

  // TODO: add state for: createRegionInteraction, etc. 
};


/*
 * ACTION HANDLERS
 * Consider: moving this to it's own file; using Immer if the {...state} type updates become too cumbersome.
 */
let actionHandlers = {};

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

actionHandlers["startCreateRegion"] = (state, payload) => {
  return {
    ...state,
    uiState: UIState.CreateRegion,
  };
};

actionHandlers["cancelCreateRegion"] = (state, payload) => {
  // TODO: in the future, we need to clean up any state associated w/ createRegion!
  return {
    ...state,
    uiState: UIState.Default,
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
