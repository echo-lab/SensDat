import * as d3 from "d3";

import { EllipseRegion, RectRegion } from "./states/region.js";
import { CompoundState } from "./states/compound-state.js";
import styled from "styled-components";
import { EditBox } from "./edit-box.js";
import { ConditionState } from "./states/condition-state.js";
import { PXL_HEIGHT, PXL_WIDTH } from "../../utils/constants.js";
import { SequenceState } from "./states/sequence-state.js";
import { TimespanState } from "./states/timespan-state.js";

// This is very sad.
const stateFactories = [
  (o) => EllipseRegion.fromObject(o),
  (o) => CompoundState.fromObject(o),
  (o) => RectRegion.fromObject(o),
  (o) => ConditionState.fromObject(o),
  (o) => SequenceState.fromObject(o),
  (o) => TimespanState.fromObject(o),
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
      (s instanceof CompoundState &&
        s.states.some((dep) => dep.id === state.id)) ||
      (s instanceof SequenceState && s.states.includes(state.id))
  );
  let res = [...deps];
  deps.forEach((dep) => res.push(...getDependentStates(dep, states)));
  return res;
}

// Puts the Date object into a format like "11/11/2021 03:22:21 PM"
export function stringTime(t) {
  return [t.toLocaleDateString(), t.toLocaleTimeString()].join(" ");
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

// Look for target sequence (targetSeq) in sequence (seq).
// Returns a list corresponding to each element in seq, labelling it with
// `seqNum', i.e., which sequence its part of, and
// `nextSeq', i.e., how many entries ahead do we need to skip to get to a different seqNum.
// `prevSeq', i.e., how many before do we need to skip to get a different seqNum.
export function getSequenceInfo(seq, targetSeq) {
  let res = seq.map((r) => ({ seqNum: -1, nextSeq: 1, prevSeq: 1 }));
  let cur = 1;

  for (let i = 0; i < seq.length; i++) {
    if (targetSeq.length === 0) break; // Shouldn't happen!
    if (i + targetSeq.length > seq.length) break; // Not enough elements left.

    if (targetSeq.some((t, idx) => t !== seq[i + idx])) {
      // We didn't find our target sequence.
      continue;
    }
    for (let j = 0; j < targetSeq.length; j++) {
      res[i + j].seqNum = cur;
    }
    cur += 1;
    i += targetSeq.length - 1;
  }

  // Now... go back through res and calculate the "nextSeq" thing.
  for (let i = res.length - 2; i >= 0; i--) {
    if (res[i].seqNum === res[i + 1].seqNum) {
      res[i].nextSeq = res[i + 1].nextSeq + 1;
    }
  }
  for (let i = 1; i < res.length; i++) {
    if (res[i - 1].seqNum === res[i].seqNum) {
      res[i].prevSeq = res[i - 1].prevSeq + 1;
    }
  }

  return res;
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
export function latLongDist(lat1, lon1, lat2, lon2) {
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
