import { EllipseRegion } from "./states/region.js";
import { CompoundState } from "./states/compound-state.js";

// This is slightly sad.
const stateFactories = [
  o=>EllipseRegion.fromObject(o),
  o=>CompoundState.fromObject(o),
];

// This assumes that the stateFactories will return null if the object isn't
// the correct state type.
export function objectToState(o) {
  let res;
  for (let fromObject of stateFactories) {
    res = fromObject(o);
    if (res) return res;
  }
  return null;
}

// From: https://stackoverflow.com/questions/8012002/create-a-unique-number-with-javascript-time
// Note: this is used for creating accessors in DataTable. If this is called
// more than once per millisecond, it will not produce unique data :)
export function uid() {
  return String(new Date().valueOf());
}

// Returns all entries in states which are downstream dependencies of state.
// For example, if state is a region called A and states contains a compound
// state called "AB" which combines regions A and B, then we should return
// the compound state AB.
export function getDependentStates(state, states) {
  let deps = states.filter(s => (
    s instanceof CompoundState &&
    s.states.some(dep => dep.id === state.id)
  ));
  let res = [...deps];
  deps.forEach(dep=>res.push(...getDependentStates(dep, states)));
  return res;
}
