import React, { useState, useRef, useEffect } from "react";

import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

import * as d3 from "d3";

import { actions } from "./app-state.js";
import { EditBox } from "./edit-box.js";

import { PXL_HEIGHT, PXL_WIDTH } from "./constants.js";
const PATH_COLOR = "#69b3a2";

// data: a list of [{Latitude, Longitude, Order, Timestamp}, ...]
export function DataEditor({
  data,
  defaultTransform,
  currentTransform,
  siteLayout,
  dispatch,
}) {
  const svgRef = useRef();
  let [onSubmit, setOnSubmit] = useState(() => {});

  useEffect(() => {
    if (!svgRef.current) return; // Is this needed?

    // Put it in x-y coordinates in the SVG space
    let tdata = data.map(({ Latitude, Longitude }) =>
      currentTransform.transformPoint([Longitude, Latitude])
    );

    let svg = d3.select(svgRef.current);
    let zoomG = d3.select(svgRef.current.childNodes[0]);
    let siteLayoutImageTag = d3.select(
      svgRef.current.childNodes[0].childNodes[0].childNodes[0]
    );
    let dataG = d3.select(svgRef.current.childNodes[0].childNodes[1]);
    let editBoxG = d3.select(svgRef.current.childNodes[0].childNodes[2]);

    initializeSVG(svg, zoomG, dataG, tdata);

    let editBox = new EditBox(currentTransform.currentParams);
    let onUpdate = () => dataG.attr("transform", editBox.getTransform());
    editBox.attachToSVG(editBoxG, onUpdate);
    setOnSubmit(() => () => {
      let res = new EditBox(
        currentTransform.initialParams,
        editBox.currentParams
      );
      dispatch(actions.finishEditData(res));
    });

    // Draw the site map, if it exists.
    siteLayout && drawSiteLayout(siteLayoutImageTag, siteLayout);
  }, [data, defaultTransform, currentTransform, dispatch, siteLayout]);

  let onCancel = () => {
    dispatch(actions.cancelEditData());
  };

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
            <g className="siteLayoutG">
              <image />
            </g>
            <g className="dataG"></g>
            <g className="editboxG"></g>
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

function initializeSVG(svg, zoomG, dataG, data) {
  // First, set up zooming/panning relative to the outer <g> tag.
  zoomG.attr("transform", ""); // Reset any existing transforms

  let handleZoom = (e) => zoomG.attr("transform", e.transform);
  let zoom = d3
    .zoom()
    .translateExtent([
      [-1.5 * PXL_WIDTH, -1.5 * PXL_HEIGHT],
      [2.5 * PXL_WIDTH, 2.5 * PXL_HEIGHT],
    ])
    .scaleExtent([0.5, 3.0])
    .on("zoom", handleZoom);
  svg.call(zoom);

  // Now, let's draw the data points.
  dataG.selectAll("*").remove();

  // Draw the path. NOTE: This is in Lat/Long space, so wee need to transform it via the EditBox.
  dataG
    .append("path")
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
}

// This is duplicated from viz-view.js, which is kind of sad.
function drawSiteLayout(imageTag, siteLayout) {
  let { x, y, height, width } = siteLayout.idealSVGParams(
    PXL_WIDTH,
    PXL_HEIGHT
  );
  imageTag
    .attr("href", siteLayout.url)
    .attr("width", width)
    .attr("height", height)
    .attr("x", x)
    .attr("y", y);
}
