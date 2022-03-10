import * as d3 from "d3";
import { actions } from "./app-state.js";

// A class for handling the user interactions for creating a new region state.
// The user creates the new region by clicking on the svgElement.
// The argument 'coordRanges' is kind of a grab-bag of useful things which help
// coordinate between SVG coordinates and latitude/longitude, and also help
// us detect when a click is within in the proper range. It should probably be
// renamed to something much clearer lol.
//
// For now: this class just lets the user click to add a one-size circular region.
// Still TODO:
//  - Change the DataTable to reflect the tentative new state.
export class CreateRegionInteraction {
  constructor(svgElement, coordRanges, dispatch) {
    this.svg = svgElement;
    this.dispatch = dispatch;
    this.coordRanges = coordRanges;

    this.callbacks = [["click", this.onClick.bind(this)]];
    this.callbacks.forEach((args) => this.svg.addEventListener(...args));

    this.element = null;
  }

  onClick(e) {
    e.preventDefault();
    let [x, y] = d3.pointer(e, this.svg);
    let [long, lat] = this.coordRanges.pxlToLatLong(x, y);
    console.log("x, y: ", x, y);
    console.log("long/lat: ", long, lat);

    let [minX, maxX] = this.coordRanges.svgX;
    let [maxY, minY] = this.coordRanges.svgY;
    if (x < minX || x > maxX || y < minY || y > maxY) {
      return;
    }

    // This is hella temporary!
    if (this.element !== null) {
      this.element.setAttribute("cx", x);
      this.element.setAttribute("cy", y);
    } else {
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
        ["r", 30],
        ["stroke", "black"],
        ["stroke-width", 1],
        ["fill", "transparent"],
      ].forEach(([attr, val]) => this.element.setAttribute(attr, val));
      this.svg.appendChild(this.element);

      // TODO: get a payload in there which will allow the DataTable to update!
      this.dispatch(actions.createRegionTemp());
    }
  }

  redraw() {
    this.svg.appendChild(this.element);
  }

  cleanup() {
    this.callbacks.forEach((args) => this.svg.removeEventListener(...args));
  }
}
