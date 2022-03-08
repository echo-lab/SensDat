import React, { useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import { Range } from "rc-slider";
import "rc-slider/assets/index.css";
import { UIState } from "./ui-state.js";
import { actions } from "./app-state.js";

const PADDING_FRACTION = 1.1;

/*
 * Creates a visualization of the data.
 *
 * Args:
 * - dataTable:
 *      A DataTable object. Might not need the entire thing...
 * - vizTimespan:
 *      A range [x, y] where 0 <= x <= y < = 100.
 */
export function VizView({ dataTable, vizTimespan, uistate, dispatch }) {
  const svgRef = useRef();

  // Function to update the SVG.
  useEffect(
    () => {
      let svg = d3.select(svgRef.current);
      if (dataTable) drawToSVG(svg, dataTable, vizTimespan);
      return () => {};
    },
    /*dependencies=*/ [dataTable, vizTimespan]
  );

  let rangeSliderProps = {
    allowCross: false,
    // TODO: investigate why settings this to dataTable.length - 1 doesn't work
    max: 100,
    defaultValue: [0, 100],
    draggableTrack: true,
    // onAfterChange: ...,
    onChange: (val)=>dispatch(actions.changeTimespan(val)),
    // Also see: trackStyle, railStyle, dotStyle, activeDotStyle
  };

  // TODO: Figure out what these should be and probably move them.
  const svgStyle = {
    height: 500,
    width: 800,
    marginRight: "0px",
    marginLeft: "0px",
    border: "solid 1px black",
  };
  const sliderDivStyle = { width: 400, margin: 50 };

  // Lol - this is probably a bad way to do it... Maybe should pull out
  // the class name 'def-visible' as a constant somewhere.
  let classNames = "viz-container debug" + (uistate.showViz() ? " def-visible" : "");

  return (
    <div className={classNames}>
      <svg ref={svgRef} style={svgStyle}></svg>
      <div style={sliderDivStyle}>
        <p>Timespan</p>
        <Range {...rangeSliderProps} />
      </div>
    </div>
  );
}

function drawToSVG(svg, dataTable, timespan) {
  let data = dataTable.data();

  const totalHeight = 500;
  const totalWidth = 800;
  const margin = { top: 30, right: 30, bottom: 30, left: 50 };
  const width = totalWidth - margin.left - margin.right;
  const height = totalHeight - margin.top - margin.bottom;

  // Get the domain for the data before we filter out the non-visualized points!
  // Also: dilate the ranges so we don't plot points on the axes.
  let [latDomain, longDomain] = getLatLongDomain(
    d3.extent(data, (d) => d.Longitude),
    d3.extent(data, (d) => d.Latitude),
    [width, height]
  ).map((rng) => scaleRange(rng, PADDING_FRACTION));

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

  // Based on: https://www.d3-graph-gallery.com/graph/connectedscatter_basic.html
  svg = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.right})`);

  // let m = 10; // margin to separate the data from the axes.
  var x = d3
    .scaleLinear()
    // .domain(d3.extent(data, (d) => d.Longitude))
    .domain(longDomain)
    .range([0, width]);

  var y = d3
    .scaleLinear()
    .domain(latDomain)
    // .domain(d3.extent(data, (d) => d.Latitude))
    .range([height, 0]);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).ticks(4));
  svg.append("g").call(d3.axisLeft(y).ticks(4));

  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#69b3a2")
    .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(d.Longitude))
        .y((d) => y(d.Latitude))
    );

  svg
    .append("g")
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.Longitude))
    .attr("cy", (d) => y(d.Latitude))
    .attr("r", 3)
    .attr("fill", "#69b3a2")
    .on("click", selectPoint)
    .on("mouseenter", (e) => {
      console.log("mouseenter event: ", e);
    })
    .on("mouseleave", (e) => {
      console.log("mouseleave event: ", e);
    });
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
