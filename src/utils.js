import { EllipseRegion } from "./states/region.js";

// This is slightly sad.
const stateFactories = [o=>EllipseRegion.fromObject(o)];

// This assumes that the stateFactories will return null if the object isn't
// the correct state type.
export function objectToState(o) {
  let res;
  for (let fromObject of stateFactories) {
    res = fromObject(o);
    if (o) return res;
  }
  return null;
}

// From: https://stackoverflow.com/questions/8012002/create-a-unique-number-with-javascript-time
// Note: this is used for creating accessors in DataTable. If this is called
// more than once per millisecond, it will not produce unique data :)
export function uid() {
  return String(new Date().valueOf());
}
