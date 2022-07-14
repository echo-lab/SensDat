import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { Range } from "rc-slider";
import "rc-slider/assets/index.css";
import { actions } from "./app-state.js";
import {EllipseRegion} from "./states/region.js";

const PADDING_FRACTION = 1.1;

const SVG_ASPECT_RATIO = 8/5;  // width/height
const SVG_MARGIN = { TOP: 30, RIGHT: 30, BOTTOM: 30, LEFT: 50 };

const DOT_COLOR = "#69b3a2";
const DOT_HIGHLIGHT_COLOR = "#91fd76";
const PATH_COLOR = "#69b3a2";

/*
 * Creates a visualization of the data.
 *
 * Args:
 * - vizData:
 *      A list of objects like: [{Order, Latitude, Longitude}, ...].
 *      Should come from DataTable.vizData
 * - vizTimespan:
 *      A range [x, y] where 0 <= x <= y < = 100.
 */
export function VizView({
  vizData, vizTimespan, uistate, dispatch,
  createRegionInteraction, highlightedPoints, userDefinedStates,
  dimensions
 }) {
  const svgRef = useRef();
  const d3Dots = useRef();
  const svgCoordMapping = useRef(null);

  let svgWidth = (dimensions.width * 0.97) || 500;  // Default to 500 to avoid an error message
  let svgHeight = svgWidth / SVG_ASPECT_RATIO;

  // Update the coordinate mapping.
  useEffect(
    () => {
      if (!vizData) return;
      svgCoordMapping.current = getSvgCoordMapping(vizData, svgWidth, svgHeight);
    },
    /*dependencies=*/ [vizData, svgWidth, svgHeight]
  );

  // Function to update the SVG.
  useEffect(
    () => {
      let svg = d3.select(svgRef.current);
      if (!vizData) return;

      d3Dots.current = drawToSVG(svg, vizData, vizTimespan, svgCoordMapping.current, userDefinedStates);
      createRegionInteraction && createRegionInteraction.redraw(svgCoordMapping.current);

      return () => {};
    },
    /*dependencies=*/ [vizData, vizTimespan, createRegionInteraction, userDefinedStates, dimensions]
  );

  // This initializes the createRegionInteraction with the SVG.
  useEffect(
    () => {
      createRegionInteraction && createRegionInteraction.initializeSvg(svgRef.current, svgCoordMapping.current);
    },
    /*dependencies=*/ [createRegionInteraction]
  );

  // Function to highlight points.
  useEffect(
    () => {
      if (!d3Dots.current || !highlightedPoints) return;

      // let [lo, hi] = highlightedPoints;
      // let withinBounds = d=>highlightedPoints.some(([lo, hi])=> lo <= d.Order && d.Order <= hi);
      let matches = d3Dots.current
        .filter(d=>highlightedPoints.some(
          ([lo, hi])=>(lo <= d.Order && d.Order <= hi)));
      matches.attr("fill", DOT_HIGHLIGHT_COLOR).attr("stroke", "black").attr("r", 3.5).raise();

      return () => {
        matches.attr("fill", DOT_COLOR).attr("stroke", null).attr("r", 3);
      };
    },
    /*deps=*/[vizData, vizTimespan, createRegionInteraction, highlightedPoints, dimensions]
  );


  let rangeSliderProps = {
    // TODO: investigate why settings this to dataTable.length - 1 doesn't work
    max: 100,
    defaultValue: [0, 100],
    allowCross: false,
    draggableTrack: true,
    // onAfterChange: ...,
    onChange: (val) => dispatch(actions.changeTimespan(val)),
  };

  // TODO: Figure out what these should be and probably move them.
  const svgStyle = {
    height: svgHeight,
    width: svgWidth,
    marginRight: "0px",
    marginLeft: "0px",
    border: "solid 1px black",
  };
  const sliderDivStyle = {
    width: svgWidth - 150,  // TODO: fix this - it's a weird magic value
    margin: 50
  };

  return (
    <div className="viz-container debug def-visible">
      <svg ref={svgRef} style={svgStyle}></svg>
      <div style={sliderDivStyle}>
        <p>Timespan</p>
        <Range {...rangeSliderProps} />
      </div>
    </div>
  );
}

// Get information about how the SVG's xy-coordinates should correspond to
// latitude/longitude based on the data table.
// Returns: {
//   svgX: [minXPixel, maxXPixel],
//   xvgY: [bottomYPixel, topYPixel],
//   xToLong: function(),
//   yToLat: function(),
//   longToX: function(),
//   latToY: function(),
// }
//
// NOTE: the latitude/longitude are scaled appropriately so that the data fits nicely
// in the graph and the XY distance is true-to-life.
function getSvgCoordMapping(data, width, height) {
  // Note: we dilate the range by PADDING_FRACTION at the end so that we don't
  // plot data right on the axes. Of course, we could also constrict the svgX
  // and svgY range instead.
  let [latitude, longitude] = getLatLongDomain(
    d3.extent(data, (d) => d.Longitude),
    d3.extent(data, (d) => d.Latitude),
    [width, height]
  ).map((rng) => scaleRange(rng, PADDING_FRACTION));

  let svgX = [SVG_MARGIN.LEFT, width - SVG_MARGIN.RIGHT];
  let svgY = [height - SVG_MARGIN.BOTTOM, SVG_MARGIN.TOP];

  return {
    svgX, svgY,
    xToLong: d3.scaleLinear().domain(svgX).range(longitude),
    yToLat: d3.scaleLinear().domain(svgY).range(latitude),
    longToX: d3.scaleLinear().domain(longitude).range(svgX),
    latToY: d3.scaleLinear().domain(latitude).range(svgY),
  };
}

function drawToSVG(svg, data, timespan, svgCoordMapping, userDefinedStates) {
  let {longToX, latToY} = svgCoordMapping;  // These are functions
  let {svgX, svgY} = svgCoordMapping;  // These are range values, i.e., [low, high]

  // Filter to the selected timespan range.
  data = filterByTimespan(data, timespan);

  // Clear the SVG! Maybe there's a nicer way?
  svg.selectAll("*").remove();

  let [selectPoint, deselectPoints] = makeHandlers();

  // TODO: can we rely on this getting called after the on-click handler for each
  // datapoint?
  svg.on("click", (e) => {
    if (!e.defaultPrevented) deselectPoints();
  });

  // Draw the trajectory. Loosely based on:
  // https://www.d3-graph-gallery.com/graph/connectedscatter_basic.html

  // X-axis
  svg
    .append("g")
    .attr("transform", `translate(0, ${svgY[0]})`)
    .call(d3.axisBottom(longToX).ticks(4));

  // Y-axis
  svg
    .append("g")
    .attr("transform", `translate(${svgX[0]}, 0)`)
    .call(d3.axisLeft(latToY).ticks(4));

  // Trajectory
  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", PATH_COLOR)
    .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line()
        .x((d) => longToX(d.Longitude))
        .y((d) => latToY(d.Latitude))
    );

  // Datapoints
  let dots = svg
    .append("g")
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => longToX(d.Longitude))
    .attr("cy", (d) => latToY(d.Latitude))
    .attr("r", 3)
    .attr("fill", DOT_COLOR);
    // .on("click", selectPoint)
    // .on("mouseenter", (e) => {
    //   console.log("mouseenter event: ", e);
    // })
    // .on("mouseleave", (e) => {
    //   console.log("mouseleave event: ", e);
    // });

  // Draw the current regions
  let regions = svg.selectAll("regionStates")
    .data(userDefinedStates.filter(s=>s instanceof EllipseRegion))
    .enter()
    .append("g");

  regions
    .append("ellipse")
    .style("stroke", "black")
    .style("fill-opacity", 0.0)
    .attr("cx", d=>longToX(d.cx))
    .attr("cy", d=>latToY(d.cy))
    .attr("rx", d=>Math.abs(longToX(d.cx+d.rx) - longToX(d.cx)))
    .attr("ry", d=>Math.abs(latToY(d.cy+d.ry) - latToY(d.cy)));

  regions.append("text")
      .attr("x", d=>longToX(d.cx))
      .attr("y", d=>latToY(d.cy+d.ry))
      .attr("text-anchor", "middle")
      .attr("dy", "-.35em")
      .text(d=>d.name);

  return dots;
}

function makeHandlers() {
  let onDeselect;

  let deselect = () => {
    if (!onDeselect) return;
    onDeselect();
    onDeselect = null;
  };

  let select = (e, d) => {
    e.preventDefault();
    deselect();
    let elem = d3.select(e.currentTarget);
    elem.attr("stroke", "black");
    onDeselect = () => {
      elem.attr("stroke", null);
    };
  };

  return [select, deselect];
}

/* ----------------- */
/* UTILITY FUNCTIONS */
/* ----------------- */

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
  const mid = (hi + lo) / 2;
  const m = ((hi - lo) / 2) * factor;
  return [mid - m, mid + m];
}

// TODO: TEST THIS! YOU MUST!
function getLatLongDomain([long0, long1], [lat0, lat1], [width, height]) {
  // dx and dy are the actual (slightly approximate) physical distances spanned
  // by the longitude and latitude, respectively.
  const dx = latLongDist(lat0, long0, lat0, long1);
  const dy = latLongDist(lat0, long0, lat1, long0);

  // The idea here is that we want the scale in the graph to correspond to
  // the actual, physical distances. This will be true if dx/dy = width/height.
  // If dx/dy < width/height, we need to pad the longitude scale, and vice versa.
  let latDomain = [lat0, lat1];
  let longDomain = [long0, long1];
  if (dx / dy < width / height) {
    longDomain = scaleRange(longDomain, ((width / height) * dy) / dx);
  } else {
    latDomain = scaleRange(latDomain, ((height / width) * dx) / dy);
  }
  return [latDomain, longDomain];
}

// TODO: this should probably filter by actual time instead of "order"/"index".
// Plus: we should not be assuming the index column is called 'Order'.
function filterByTimespan(data, timespan) {
  let [minOrder, maxOrder] = d3.extent(data, (d) => d.Order);
  let [r1, r2] = timespan;
  let mno = minOrder + (r1 / 100) * (maxOrder - minOrder);
  let mxo = minOrder + (r2 / 100) * (maxOrder - minOrder);
  return data.filter((row) => row.Order >= mno && row.Order <= mxo);
}
