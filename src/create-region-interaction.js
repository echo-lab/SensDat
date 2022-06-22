import * as d3 from "d3";
import { actions } from "./app-state.js";
import { EllipseRegion } from "./states/region.js";
import debounce from 'lodash.debounce'

const RADIUS = 30;

// A class for handling the user interactions for creating a new region state.
// The user creates the new region by clicking on the svgElement.
// The argument 'svgCoordMapping' is kind of a grab-bag of useful things which help
// coordinate between SVG coordinates and latitude/longitude, and also help
// us detect when a click is within in the proper range.
// For now: this class just lets the user click to add a one-size circular region.
export class CreateRegionInteraction {
  constructor(dispatch) {
    this.dispatch = dispatch;
    this.name = "";
    this.userDefinedState = null;

    this.debouncedCreateTempState = debounce((userDefinedState)=>{
      this.dispatch(actions.createTempState({userDefinedState}));
    },
    1000);
  }

  initializeSvg(svgElement, svgCoordMapping) {
    this.svg = svgElement;
    this.svgCoordMapping = svgCoordMapping;

    this.callbacks = [["click", this.onClick.bind(this)]];
    this.callbacks.forEach((args) => this.svg.addEventListener(...args));

    this.element = null;
  }

  setName(name) {
    this.name = name;
    if (!this.userDefinedState) return;

    let userDefinedState = this.userDefinedState.withName(name);
    this.userDefinedState = userDefinedState;
    this.debouncedCreateTempState(userDefinedState);
  }

  onClick(e) {
    e.preventDefault();
    let {xToLong, yToLat, svgX, svgY} = this.svgCoordMapping;
    let [x, y] = d3.pointer(e, this.svg);

    let [[minX, maxX], [maxY, minY]] = [svgX, svgY];
    if (x < minX || x > maxX || y < minY || y > maxY) {
      return;
    }

    // TODO: do this in viz-view.js
    if (this.element === null) {
      // This is sad! Maybe it's better to put this into a React Component :)
      // If it's possible, anyway! Dunno if we can have the SVG managed by d3 but also having a group
      // which is a react component ...
      // An alternative is that we use two SVGs which are overlaid :)
      // If we do that, we might need to do something fancy to allow events in general, e.g.,
      // style="pointer-events:none;" on the overlay, maybe.
      this.element = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      [
        ["cx", x],
        ["cy", y],
        ["r", RADIUS],
        ["stroke", "black"],
        ["stroke-width", 1],
        ["fill", "transparent"],
      ].forEach(([attr, val]) => this.element.setAttribute(attr, val));
      this.svg.appendChild(this.element);
    }

    // Possibly redundant, but whatevs!
    this.element.setAttribute("cx", x);
    this.element.setAttribute("cy", y);
    this.element.setAttribute("r", RADIUS);

    let [cx, cy] = [xToLong(x), yToLat(y)];
    let rx = xToLong(x+RADIUS) - cx;
    let ry = yToLat(y-RADIUS) - cy;
    this.userDefinedState = new EllipseRegion([cx, cy], rx, ry, this.name);
    this.debouncedCreateTempState(this.userDefinedState);
  }

  // Need to pass in the Lat/Long -> pixel mapping again - it may have changed,
  // e.g., if the svg was resized.
  redraw(svgCoordMapping) {
    this.svgCoordMapping = svgCoordMapping;
    if (!this.element) return;
    if (!this.userDefinedState) return;

    let s = this.userDefinedState;  // Has Lat/Long coordinates.
    let {longToX, latToY} = this.svgCoordMapping;
    this.element.setAttribute("cx", longToX(s.cx));
    this.element.setAttribute("cy", latToY(s.cy));
    this.element.setAttribute("r", longToX(s.cx + s.rx) - longToX(s.cx));

    this.svg.appendChild(this.element);
  }

  cleanup() {
    this.callbacks.forEach((args) => this.svg.removeEventListener(...args));
  }
}
