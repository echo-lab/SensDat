import * as d3 from "d3";

const BOX_COLOR = "#a8a3f2";
const HANDLE_LENGTH = 50;
const RECT_WIDTH = 10;
const MIN_DIM = -1e10; // Can set to something like 20 to limit how much we can shrink the data.

/*
 * EditBox attaches a box to an SVG that the user can use to
 * scale, rotate, and translate its contents.
 */
export class EditBox {
  // TODO: Change the constructor to take in the width/height, etc (probably)
  // x1, y1 is top-left, x2, y2 is bottom-right
  constructor(x1, y1, x2, y2) {
    // These params are easy to update on drag events :)
    // NOTE: initialParams is ONLY used to determine the transform :)
    this.initialParams = {
      center: [(x1 + x2) / 2, (y1 + y2) / 2],
      width: x2 - x1,
      height: y2 - y1,
      angle: 0,
    };
    this.currentParams = {
      ...this.initialParams,
    };
  }

  // This must be called to actually add the editable box to the SVG.
  //   g:     the group the elements will be added to.
  //   dataG: if provided, a group which will receive the same transforms the user
  //          performs on the EditBox. Should be a sibling of g.
  attachToSVG(g, dataG) {
    this.g = g;
    this.dataG = dataG;

    // Add all the SVG elements.
    // They will be positioned in the end with a call to this.updateSVG();
    this.box = g
      .append("polygon")
      .attr("stroke", BOX_COLOR)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 1")
      .attr("pointer-events", "visible")
      .attr("fill", "none")
      .attr("cursor", "grab");

    // Add the handle for rotation
    this.handle = g
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

    this.knobs = Object.entries(this.#getPoints()).reduce(
      (prev, [key, point]) => ({
        ...prev,
        [key]: addRect(point),
      }),
      {}
    );
    this.knobs.handle.attr("cursor", "crosshair");

    this.#updateSVG();
    this.#attachListeners();
  }

  #attachListeners() {
    /////////////////
    // Translation //
    /////////////////

    // TODO: consider placing bounds?
    let translateOffset;
    let startTranslate = (e) => {
      let [cx, cy] = this.currentParams.center;
      translateOffset = [cx - e.x, cy - e.y];
      this.box.attr("cursor", "grabbing");
    };
    let onTranslating = (e) => {
      let [dx, dy] = translateOffset;
      this.currentParams.center = [e.x + dx, e.y + dy];
      this.#updateSVG();
    };
    let onTranslateEnd = (e) => {
      onTranslating(e);
      this.box.attr("cursor", "grab");
    };
    let translateDrag = d3
      .drag()
      .on("start", startTranslate)
      .on("drag", onTranslating)
      .on("end", onTranslateEnd);
    this.box.call(translateDrag);

    //////////////
    // Rotation //
    //////////////
    let startRotating = (e) => {
      console.log("starting rotate");
    };
    let onRotating = (e) => {
      let {
        center: [cx, cy],
      } = this.currentParams;
      let [x, y] = [e.x - cx, e.y - cy];
      let rads = Math.acos(-y / Math.sqrt(x * x + y * y));
      // console.log(rads);
      let degs = (rads / (Math.PI * 2)) * 360;
      let sign = e.x > cx ? 1 : -1;
      this.currentParams.angle = sign * degs;
      this.#updateSVG();
    };
    let rotateDrag = d3
      .drag()
      .on("start", startRotating)
      .on("drag", onRotating)
      .on("end", onRotating);
    this.knobs.handle.call(rotateDrag);

    /////////////
    // Scaling //
    /////////////
    let scaleInDirections = (cursor, dirs) => {
      let [x, y] = cursor;
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
        this.#updateSVG();
      };
      this.knobs[key].call(
        d3
          .drag()
          .on("start", (e) => {})
          .on("drag", onDrag)
          .on("end", onDrag)
      );
    });
  }

  // Get a transform that would change the original box into the new one :)
  // We don't use transforms for the new box because it's difficult to reason about
  // the coordinates when the transform keeps changing.
  #getTransform() {
    let {
      center: [x, y],
      width,
      height,
      angle,
    } = this.currentParams;
    let [x0, y0] = this.initialParams.center;
    let w0 = this.initialParams.width;
    let h0 = this.initialParams.height;

    // NOTE: THESE HAPPEN BACKWARDS!!!
    return [
      `translate(${x} ${y})`,
      `rotate(${angle})`,
      `scale(${width / w0} ${height / h0})`,
      `translate(${-x0} ${-y0})`,
    ].join(" ");
  }

  #updateSVG() {
    let points = this.#getPoints();

    // Update the knobs
    Object.entries(points).forEach(([key, [x, y]]) =>
      this.knobs[key]
        .attr("x", x - RECT_WIDTH / 2)
        .attr("y", y - RECT_WIDTH / 2)
        .attr("transform", `rotate(${this.currentParams.angle} ${x} ${y})`)
    );

    // Update the box
    let { topLeft, topRight, bottomRight, bottomLeft } = points;
    let corners = [topLeft, topRight, bottomRight, bottomLeft];
    this.box.attr("points", corners.map((x) => x.join(",")).join(" "));

    // Update the line that goes from the box to the rotate-knob
    let { handle, top } = points;
    this.handle.attr("d", d3.line()([handle, top]));

    // Update the transform for the data.
    this.dataG && this.dataG.attr("transform", this.#getTransform());
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
    let res = {
      topLeft: [x1, y1],
      topRight: [x2, y1],
      bottomRight: [x2, y2],
      bottomLeft: [x1, y2],
      top: [x, y1],
      bottom: [x, y2],
      left: [x1, y],
      right: [x2, y],
      handle: [x, y1 - HANDLE_LENGTH], // for rotating
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

// From: https://stackoverflow.com/questions/17410809/how-to-calculate-rotation-in-2d-in-javascript
function rotate(point, angle, center) {
  let [x, y] = point;
  let [cx, cy] = center || [0, 0];

  let radians = (Math.PI / 180) * -angle;
  let cos = Math.cos(radians);
  let sin = Math.sin(radians);
  let nx = cos * (x - cx) + sin * (y - cy) + cx;
  let ny = cos * (y - cy) - sin * (x - cx) + cy;
  return [nx, ny];
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
