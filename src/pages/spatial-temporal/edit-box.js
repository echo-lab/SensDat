import * as d3 from "d3";

import { rotate } from "./utils";

const BOX_COLOR = "#a8a3f2";
const HANDLE_LENGTH = 50;
const RECT_WIDTH = 10;
const MIN_DIM = -1e10; // Can set to something like 20 to limit how much we can shrink the data.

/*
 * EditBox attaches a box to an SVG that the user can use to
 * scale, rotate, and translate its contents.
 */
export class EditBox {
  constructor(initialParams, targetParams) {
    let defaultParams = {
      center: [0, 0],
      width: 0,
      height: 0,
      angle: 0,
    };

    this.initialParams = {
      ...defaultParams,
      ...(initialParams || {}),
    };

    this.currentParams = targetParams
      ? { ...defaultParams, ...targetParams }
      : { ...this.initialParams };
  }

  copy() {
    return new EditBox(this.initialParams, this.currentParams);
  }

  // Hacky hack hack.
  withTargetParams(targetParams) {
    let res = this.copy();
    res.currentParams = targetParams;
    return res;
  }

  asObject() {
    return {
      initialParams: this.initialParams,
      currentParams: this.currentParams,
    };
  }

  static fromObject({ initialParams, currentParams }) {
    return new EditBox(initialParams, currentParams);
  }

  // This must be called to actually add the editable box to the SVG.
  //   g:     The group the elements will be added to.
  //   onUpdate: Optional callback to be called whenever the edit box is updated.
  //             will be called on the first render, too.
  //   onFinish: Optional callback: to be called whenever a drag/scale/rotate operation is finished
  //             and also called on the first render.
  attachToSVG(g, onUpdate, onFinish) {
    onUpdate = onUpdate || (() => {});
    onFinish = onFinish || (() => {});
    // Add all the SVG elements.
    // They will be positioned in the end with a call to this.updateSVG();
    let box = g
      .append("polygon")
      .attr("stroke", BOX_COLOR)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 1")
      .attr("pointer-events", "visible")
      .attr("fill", "none")
      .attr("cursor", "grab");

    // Add the handle for rotation
    let handleLine = g
      .append("path")
      .attr("fill", "none")
      .attr("stroke", BOX_COLOR)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 1");

    let addRect = () =>
      g
        .append("rect")
        .attr("width", RECT_WIDTH)
        .attr("height", RECT_WIDTH)
        .attr("stroke", BOX_COLOR)
        .attr("fill", BOX_COLOR)
        .attr("cursor", "pointer");

    let knobs = Object.entries(this.#getPoints()).reduce(
      (prev, [key, point]) => ({
        ...prev,
        [key]: addRect(point),
      }),
      {}
    );
    knobs.handle.attr("cursor", "crosshair");

    let args = {
      onUpdate,
      onFinish,
      box,
      handleLine,
      knobs,
    };

    this.#updateSVG(args);
    this.#attachListeners(args);
    onFinish();
  }

  #attachListeners(svgElements) {
    let { box, knobs, onFinish } = svgElements;
    /////////////////
    // Translation //
    /////////////////

    // TODO: consider placing bounds?
    let translateOffset;
    let startTranslate = (e) => {
      let [cx, cy] = this.currentParams.center;
      translateOffset = [cx - e.x, cy - e.y];
      box.attr("cursor", "grabbing");
    };
    let onTranslating = (e) => {
      let [dx, dy] = translateOffset;
      this.currentParams.center = [e.x + dx, e.y + dy];
      this.#updateSVG(svgElements);
    };
    let onTranslateEnd = (e) => {
      onTranslating(e);
      box.attr("cursor", "grab");
      onFinish();
    };
    let translateDrag = d3
      .drag()
      .on("start", startTranslate)
      .on("drag", onTranslating)
      .on("end", onTranslateEnd);
    box.call(translateDrag);

    //////////////
    // Rotation //
    //////////////
    let startRotating = () => {};
    let onRotating = (e) => {
      let {
        center: [cx, cy],
        height,
      } = this.currentParams;
      let [x, y] = [e.x - cx, e.y - cy];
      let rads = Math.acos(-y / Math.sqrt(x * x + y * y));
      let degs = (rads / (Math.PI * 2)) * 360;
      let sign = e.x > cx ? 1 : -1;
      let angle = sign * degs;
      // Correct the angle  ¯\_(ツ)_/¯
      if (height > 0) angle = (angle + 180) % 360;
      this.currentParams.angle = angle;
      this.#updateSVG(svgElements);
    };
    let endRotating = (e) => {
      onRotating(e);
      onFinish();
    };
    let rotateDrag = d3
      .drag()
      .on("start", startRotating)
      .on("drag", onRotating)
      .on("end", endRotating);
    knobs.handle.call(rotateDrag);

    /////////////
    // Scaling //
    /////////////
    let scaleInDirections = (cursor, dirs) => {
      let { angle, width, height, center } = this.currentParams;
      let { top, bottom, left, right } = this.#getPoints();

      if (dirs.includes("UP")) {
        let u = unit(angle);
        let newHeight = Math.max(MIN_DIM, dot(u, cursor) - dot(u, bottom));
        // Now, adjust the center for the new height
        let dh = newHeight - height;
        center = add(center, scale(dh / 2, u));
        height = newHeight;
      } else if (dirs.includes("DOWN")) {
        let u = unit(angle + 180);
        let newHeight = Math.max(MIN_DIM, dot(u, cursor) - dot(u, top));
        // Now, adjust the center for the new height
        let dh = newHeight - height;
        center = add(center, scale(dh / 2, u));
        height = newHeight;
      }

      if (dirs.includes("RIGHT")) {
        let u = unit(angle + 90);
        let newWidth = Math.max(MIN_DIM, dot(u, cursor) - dot(u, left));
        let dw = newWidth - width;
        center = add(center, scale(dw / 2, u));
        width = newWidth;
      } else if (dirs.includes("LEFT")) {
        let u = unit(angle - 90);
        let newWidth = Math.max(MIN_DIM, dot(u, cursor) - dot(u, right));
        let dw = newWidth - width;
        center = add(center, scale(dw / 2, u));
        width = newWidth;
      }

      this.currentParams = { center, width, height, angle };
    };

    let scalePointsToDirs = {
      topLeft: ["LEFT", "UP"],
      topRight: ["RIGHT", "UP"],
      bottomRight: ["RIGHT", "DOWN"],
      bottomLeft: ["LEFT", "DOWN"],
      top: ["UP"],
      bottom: ["DOWN"],
      left: ["LEFT"],
      right: ["RIGHT"],
    };
    Object.entries(scalePointsToDirs).forEach(([key, dirs]) => {
      let onDrag = (e) => {
        scaleInDirections([e.x, e.y], dirs);
        this.#updateSVG(svgElements);
      };
      let endDrag = (e) => {
        onDrag(e);
        onFinish();
      };
      knobs[key].call(
        d3
          .drag()
          .on("start", (e) => {})
          .on("drag", onDrag)
          .on("end", endDrag)
      );
    });
  }

  #updateSVG({ knobs, box, handleLine, onUpdate }) {
    let points = this.#getPoints();

    // Update the knobs
    Object.entries(points).forEach(([key, [x, y]]) =>
      knobs[key]
        .attr("x", x - RECT_WIDTH / 2)
        .attr("y", y - RECT_WIDTH / 2)
        .attr("transform", `rotate(${this.currentParams.angle} ${x} ${y})`)
    );

    // Update the box
    let { topLeft, topRight, bottomRight, bottomLeft } = points;
    let corners = [topLeft, topRight, bottomRight, bottomLeft];
    box.attr("points", corners.map((x) => x.join(",")).join(" "));

    // Update the line that goes from the box to the rotate-knob
    let { handle, bottom } = points;
    handleLine.attr("d", d3.line()([handle, bottom]));

    onUpdate();
  }

  // Get a transform that would change the original box into the new one :)
  // We don't use transforms for the new box because it's difficult to reason about
  // the coordinates when the transform keeps changing.
  getTransform() {
    let {
      center: [x, y],
      width,
      height,
      angle,
    } = this.currentParams;
    let [x0, y0] = this.initialParams.center;
    let w0 = this.initialParams.width;
    let h0 = this.initialParams.height;
    let angle0 = this.initialParams.angle;

    // NOTE: THESE HAPPEN BACKWARDS!!!
    return [
      `translate(${x} ${y})`, // Step 5) translate to target position
      `rotate(${angle})`, // Step 4) rotate to target position
      `scale(${width / w0} ${height / h0})`, // Step 3) scale in x and y directions
      `rotate(${-angle0})`, // Step 2) undo any initial rotation
      `translate(${-x0} ${-y0})`, // Step 1) translate back to center
    ].join(" ");
  }

  // Actually do the transform on point [x, y]
  transformPoint([x, y]) {
    let {
      center: [cx, cy],
      width,
      height,
      angle,
    } = this.currentParams;
    let [x0, y0] = this.initialParams.center;
    let w0 = this.initialParams.width;
    let h0 = this.initialParams.height;
    let a0 = this.initialParams.angle;

    [x, y] = [x - x0, y - y0]; // Step 1) translate back to center
    [x, y] = rotate([x, y], -a0, [0, 0]); // Step 2) undo any initial rotation
    [x, y] = [(width / w0) * x, (height / h0) * y]; // Step 3) scale in x and y directions
    [x, y] = rotate([x, y], angle, [0, 0]); // Step 4) rotate to target position
    [x, y] = [x + cx, y + cy]; // Step 5) translate to target position
    return [x, y];
  }

  #getPoints() {
    let {
      center: [x, y],
      width,
      height,
      angle,
    } = this.currentParams;
    let [x1, y1] = [x - width / 2, y - height / 2];
    let [x2, y2] = [x + width / 2, y + height / 2];

    // Non-rotated points :)
    let sign = (x) => (x >= 0 ? 1 : -1);
    let res = {
      topLeft: [x1, y1],
      topRight: [x2, y1],
      bottomRight: [x2, y2],
      bottomLeft: [x1, y2],
      top: [x, y1],
      bottom: [x, y2],
      left: [x1, y],
      right: [x2, y],
      handle: [x, y2 + sign(height) * HANDLE_LENGTH], // for rotating
    };

    // Now, rotate them!
    return Object.entries(res).reduce(
      (prev, [key, point]) => ({
        ...prev,
        [key]: rotate(point, angle, [x, y]),
      }),
      {}
    );
  }
}

function unit(angle) {
  let rad = (angle * Math.PI) / 180;
  return [Math.sin(rad), -Math.cos(rad)];
}

function dot([x1, y1], [x2, y2]) {
  return x1 * x2 + y1 * y2;
}

function add([x1, y1], [x2, y2]) {
  return [x1 + x2, y1 + y2];
}

function scale(a, [x, y]) {
  return [a * x, a * y];
}
