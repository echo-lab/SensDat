import * as d3 from "d3";
import debounce from "lodash.debounce";

import { actions } from "./app-state.js";
import { EllipseRegion } from "./states/region.js";
import { EditBox } from "./edit-box.js";

const DEFAULT_NAME = "[New Region]";

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

    // References to all the SVG elements we'll be creating.
    this.svg = null;
    this.g = null;
    this.boxG = null;
    this.elementG = null;
    this.textG = null;
    this.element = null;
    this.nameElement = null;
    this.editBox = null;

    // Debounced so we can change the name as text is entered in a form and
    // not have to recalculate the state value for each row every time.
    this.debouncedCreateTempState = debounce((userDefinedState) => {
      this.dispatch(actions.createTempState({ userDefinedState }));
    }, 200);
  }

  // svg and g are both d3 selections, e.g, `d3.select("svg")`
  initializeSvg(svg, g) {
    this.cleanup(); // Just in case this is called multiple times for whatever reason.
    this.svg = svg;
    this.g = g;
    this.boxG = g.append("g");
    this.elementG = g.append("g");
    this.textG = g.append("g");

    this.svg.on("click", this.onClick.bind(this));
  }

  setName(name) {
    this.name = name;
    this.nameElement.html(name);
    this.updateRegionState();
  }

  onClick(e) {
    if (this.element) return; // We already have a Region.
    e.preventDefault();

    let [x, y] = d3.pointer(e, this.g.node());
    const r = 30;

    this.element = this.elementG
      .append("ellipse")
      .attr("cx", x)
      .attr("cy", y)
      .attr("rx", r)
      .attr("ry", r)
      .attr("fill", "#00AAFF")
      .attr("fill-opacity", "20%")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("pointer-events", "none");

    this.nameElement = this.textG
      .append("text")
      .attr("x", x)
      .attr("y", y)
      .attr("text-anchor", "middle")
      .attr("dy", "-.35em")
      .attr("pointer-events", "none")
      .html("[New Region]");

    this.editBox = new EditBox({
      center: [x, y],
      width: 2 * r,
      height: -2 * r,
      angle: 0,
    });

    let onUpdate = this.onEditBoxUpdate.bind(this);
    let onFinish = this.updateRegionState.bind(this);
    this.editBox.attachToSVG(this.boxG, onUpdate, onFinish);
  }

  // Change the region shape when the EditBox updates.
  onEditBoxUpdate() {
    // It would be easier to just set the transform using EditBox's getTransform(), but:
    // 1) we don't want to stretch the text in nameElement, and
    // 2) we don't want to alter the stroke thickness in the region element... (eh)
    let {
      center: [cx, cy],
      width,
      height,
      angle,
    } = this.editBox.currentParams;
    this.element
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("rx", Math.abs(width) / 2)
      .attr("ry", Math.abs(height) / 2)
      .attr("transform", `rotate(${angle} ${cx} ${cy})`);

    // TODO: come up with a better rule for moving the text...
    this.nameElement.attr("x", cx).attr("y", cy - Math.abs(height) / 2 - 20);
  }

  updateRegionState() {
    if (!this.editBox) return;
    // Get the current region/name
    let { center, width, height, angle } = this.editBox.currentParams;
    let name = this.name !== "" ? this.name : DEFAULT_NAME;
    let region = new EllipseRegion(
      center,
      Math.abs(width) / 2,
      Math.abs(height / 2),
      angle,
      name
    );
    this.debouncedCreateTempState(region);
  }

  cleanup() {
    this.svg && this.svg.on("click", null);
    this.g && this.g.selectAll("*").remove();
  }
}
