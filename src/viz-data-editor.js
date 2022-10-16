import React, { useState, useRef, useEffect } from "react";

import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

import * as d3 from "d3";

import { actions } from "./app-state.js";
import { EditBox } from "./edit-box.js";

// TODO: pass these from viz-view.js
const [PXL_WIDTH, PXL_HEIGHT] = [800, 500];
const PATH_COLOR = "#69b3a2";

// data: a list of x-y coordinates, e.g., [[x1, y1], [x2, y2], ...]
export function DataEditor({ data, dispatch }) {
  let [transform, setTransform] = useState(null);
  const svgRef = useRef();

  useEffect(() => {
    initializeSVG(svgRef.current, data);
  }, [data]);

  let onCancel = () => dispatch(actions.cancelEditData());
  let onSubmit = () => dispatch(actions.finishEditData(transform));

  return (
    <Modal show={true} onHide={onCancel} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Edit Data</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <svg
          ref={svgRef}
          style={{
            width: "100%",
            aspectRatio: "8/5",
            border: "solid 1px black",
          }}
          viewBox={`0 0 ${PXL_WIDTH} ${PXL_HEIGHT}`}
        >
          <g id="zoomG">
            <g id="dataG"></g>
            <g id="editboxG"></g>
          </g>
        </svg>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSubmit}>
          Done
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function initializeSVG(svg, data) {
  // First, set up zooming/panning relative to the outer <g> tag.
  let zoomG = d3.select(svg.childNodes[0]);
  zoomG.attr("transform", ""); // Reset any existing transforms

  let handleZoom = (e) => zoomG.attr("transform", e.transform);
  let zoom = d3
    .zoom()
    .translateExtent([
      [-1.5 * PXL_WIDTH, -1.5 * PXL_HEIGHT],
      [2.5 * PXL_WIDTH, 2.5 * PXL_HEIGHT],
    ])
    .scaleExtent([0.25, 3.0])
    .on("zoom", handleZoom);
  d3.select(svg).call(zoom);

  // Now, let's draw the data points.
  let g = d3.select(svg.childNodes[0].childNodes[0]);
  g.selectAll("*").remove();

  // Draw the path
  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", PATH_COLOR)
    .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line()
        .x((d) => d[0])
        .y((d) => d[1])
    );

  // Make the EditBox!
  let editboxG = d3.select(svg.childNodes[0].childNodes[1]);
  let [x1, x2] = d3.extent(data, (d) => d[0]);
  let [y1, y2] = d3.extent(data, (d) => d[1]);
  let editBox = new EditBox(x1, y1, x2, y2);
  editBox.attachToSVG(editboxG, g);
}
