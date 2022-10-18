import * as d3 from "d3";

import { EllipseRegion } from "./states/region.js";
import { CompoundState } from "./states/compound-state.js";
import styled from "styled-components";
import { EditBox } from "./edit-box.js";

import { PXL_HEIGHT, PXL_WIDTH } from "./constants.js";

// This is slightly sad.
const stateFactories = [
  (o) => EllipseRegion.fromObject(o),
  (o) => CompoundState.fromObject(o),
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
  let deps = states.filter(
    (s) =>
      s instanceof CompoundState && s.states.some((dep) => dep.id === state.id)
  );
  let res = [...deps];
  deps.forEach((dep) => res.push(...getDependentStates(dep, states)));
  return res;
}

export function hhmmss(d) {
  if (!d.getHours || !d.getMinutes || !d.getSeconds) return "00:00:00";

  return [
    d.getHours() < 10 ? "0" + d.getHours() : d.getHours(),
    d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes(),
    d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds(),
  ].join(":");
  // return [d.getHours(), d.getMinutes(), d.getSeconds()].join(":");
}

export function timeDiffString(t1, t2) {
  return millisToTimeString(t2.getTime() - t1.getTime());
}

export function millisToTimeString(ms) {
  let seconds = parseInt(Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;

  let minutes = parseInt(seconds / 60);
  seconds = seconds % 60;
  return `${minutes}m ${seconds}s`;
}

// From: https://stackoverflow.com/questions/17410809/how-to-calculate-rotation-in-2d-in-javascript
export function rotate(point, angle, center) {
  let [x, y] = point;
  let [cx, cy] = center || [0, 0];

  let radians = (Math.PI / 180) * -angle;
  let cos = Math.cos(radians);
  let sin = Math.sin(radians);
  let nx = cos * (x - cx) + sin * (y - cy) + cx;
  let ny = cos * (y - cy) - sin * (x - cx) + cy;
  return [nx, ny];
}

// Transforms the lat/long data in 'data' into SVG-pixel-space, preserving
// relative distances.
// Tries to fill the given width/height, but padding w/ some white space.
// TODO: Possibly shouldn't depend on the data being {Latitude, Longitude, ...}
export function getDefaultDataTransform(data) {
  let [width, height] = [PXL_WIDTH, PXL_HEIGHT];
  const PADDING_FRACTION = 1.3;

  // Get min/max lat/long
  let [long0, long1] = d3.extent(data, (d) => d.Longitude);
  let [lat0, lat1] = d3.extent(data, (d) => d.Latitude);
  // Get the actual physical distances
  const dx = latLongDist(lat0, long0, lat0, long1);
  const dy = latLongDist(lat0, long0, lat1, long0);

  if (dx / dy < width / height) {
    // extend the longitude (x direction) to match the aspect ratio.
    [long0, long1] = scaleRange([long0, long1], ((width / height) * dy) / dx);
  } else {
    // extend the latitude (y direction) to match the aspect ratio.
    [lat0, lat1] = scaleRange([lat0, lat1], ((height / width) * dx) / dy);
  }

  let initialBoundingBox = {
    center: [(long0 + long1) / 2, (lat0 + lat1) / 2],
    width: long1 - long0,
    height: lat1 - lat0,
    angle: 0,
  };
  let currentBoundingBox = {
    center: [width / 2, height / 2],
    width: width / PADDING_FRACTION,
    height: (-1 * height) / PADDING_FRACTION, // -1 because svg coordinates y is flipped.
    angle: 0,
  };

  return new EditBox(initialBoundingBox, currentBoundingBox);
}

// Copied from: https://www.movable-type.co.uk/scripts/latlong.html
function latLongDist(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
}

// Scale a range, preserving the midpoint.
function scaleRange([lo, hi], factor) {
  let d = (hi - lo) * (factor - 1);
  return [lo - d / 2, hi + d / 2];
}

// This is a silly place for this, but... oh well.
// TODO: consider just moving this into CSS.
export const TableStyles = styled.div`
  padding: 1rem;

  .table {
    display: inline-block;
    border-spacing: 0;
    border: 1px solid black;
    width: auto;

    .tr {
      :last-child {
        .td {
          border-bottom: 0;
        }
      }
    }

    .th {
      font-weight: bold;
    }

    .th,
    .td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;
      text-align: center;

      :last-child {
        border-right: 1px solid black;
      }
    }
  }

  table {
    border-spacing: 0;
    border: 1px solid black;

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }

    th,
    td {
      margin: 0;
      padding: 0.5rem 1rem 0.5rem 1rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;
      text-align: center;

      :last-child {
        border-right: 0;
      }
    }
  }
`;
