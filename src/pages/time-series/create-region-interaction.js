import debounce from "lodash.debounce";

import { actions } from "./app-state.js";
import { EllipseRegion, RectRegion } from "./states/region.js";
import { EditBox } from "./edit-box.js";

const DEFAULT_NAME = "[New Region]";
const COLOR = "#00AAFF";
const OPACITY = "20%";

// A class for handling the user interactions for creating a new region state.
// Must use 'initializeSvg()' to properly initialize. A shape is placed automatically
// on the SVG w/ an edit box, which the user can manipulate.
export class CreateRegionInteraction {
  constructor(dispatch) {
    this.dispatch = dispatch;
    this.name = "";
    this.shape = "ELLIPSE";

    // References to all the SVG elements we'll be creating.
    this.svg = null;
    this.g = null;
    this.boxG = null;
    this.elementG = null;
    this.textG = null;
    this.ellipse = null;
    this.rect = null;
    this.nameElement = null;
    this.editBox = null;

    // Debounced so we can change the name as text is entered in a form and
    // not have to recalculate the state value for each row every time.
    this.debouncedCreateTempState = debounce((userDefinedState) => {
      this.dispatch(actions.createTempState({ userDefinedState }));
    }, 200);
  }

  setShape(shape) {
    this.shape = shape;
    this.onEditBoxUpdate();
    this.updateRegionState();
  }

  useEllipse() {
    this.setShape("ELLIPSE");
  }

  useRect() {
    this.setShape("RECT");
  }

  setName(name) {
    this.name = name;
    this.nameElement.html(name);
    this.updateRegionState();
  }

  // svg and g are both d3 selections, e.g, `d3.select("svg")`
  initializeSvg(svg, g, [x, y]) {
    this.cleanup(); // Just in case this is called multiple times for whatever reason.
    this.svg = svg;
    this.g = g;
    this.boxG = g.append("g");
    this.elementG = g.append("g");
    this.textG = g.append("g");

    const r = 30;

    // Create the shapes on the SVG. Their positions and sizes
    // will be set when the editBox renders and calls onEditBoxUpdate()
    this.ellipse = this.elementG.append("ellipse");
    this.rect = this.elementG.append("rect");
    [this.ellipse, this.rect].forEach((el) => {
      el.attr("fill", COLOR)
        .attr("fill-opacity", OPACITY)
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("pointer-events", "none");
    });

    this.nameElement = this.textG
      .append("text")
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
    if (!this.editBox) return;
    // It would be easier to just set the transform using EditBox's getTransform(), but:
    // 1) we don't want to stretch the text in nameElement, and
    // 2) we don't want to alter the stroke thickness in the region element... (eh)
    let {
      center: [cx, cy],
      width,
      height,
      angle,
    } = this.editBox.currentParams;
    [width, height] = [Math.abs(width), Math.abs(height)];
    this.ellipse
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("rx", width / 2)
      .attr("ry", height / 2)
      .attr("transform", `rotate(${angle} ${cx} ${cy})`)
      .attr("visibility", this.shape === "ELLIPSE" ? "visible" : "hidden");
    this.rect
      .attr("x", cx - width / 2)
      .attr("y", cy - height / 2)
      .attr("width", width)
      .attr("height", height)
      .attr("transform", `rotate(${angle} ${cx} ${cy})`)
      .attr("visibility", this.shape === "RECT" ? "visible" : "hidden");

    // TODO: come up with a better rule for moving the text...
    this.nameElement.attr("x", cx).attr("y", cy - Math.abs(height) / 2 - 20);
  }

  updateRegionState() {
    if (!this.editBox) return;
    // Get the current region/name
    let { center, width, height, angle } = this.editBox.currentParams;
    let name = this.name !== "" ? this.name : DEFAULT_NAME;
    [width, height] = [Math.abs(width), Math.abs(height)];
    let [rx, ry] = [width / 2, height / 2];
    let region =
      this.shape === "ELLIPSE"
        ? new EllipseRegion(center, rx, ry, angle, name)
        : new RectRegion({ center, width, height, angle }, name);
    this.debouncedCreateTempState(region);
  }

  cleanup() {
    this.g && this.g.selectAll("*").remove();
  }
}
