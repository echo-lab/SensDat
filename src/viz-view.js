import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { Range } from "rc-slider";
import "rc-slider/assets/index.css";
import { actions } from "./app-state.js";
import {EllipseRegion} from "./states/region.js";

const PADDING_FRACTION = 1.1;

const SVG_HEIGHT = 500;
const SVG_WIDTH = 800;
const SVG_MARGIN = { TOP: 30, RIGHT: 30, BOTTOM: 30, LEFT: 50 };
const SVG_EFFECTIVE_DIMS = {
  WIDTH: SVG_WIDTH - SVG_MARGIN.LEFT - SVG_MARGIN.RIGHT,
  HEIGHT: SVG_HEIGHT - SVG_MARGIN.TOP - SVG_MARGIN.BOTTOM,
};

const DOT_COLOR = "#69b3a2";
const DOT_HIGHLIGHT_COLOR = "#77f3b2";
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
export function VizView({ vizData, vizTimespan, uistate, dispatch,
    createRegionInteraction, highlightedPoints, userDefinedStates }) {
  const svgRef = useRef();
  const d3Dots = useRef();
  const coordRanges = useRef(null);

  useEffect(
    () => {
      if (!vizData) return;
      coordRanges.current = getCoordRanges(vizData);
    },
    /*dependencies=*/ [vizData]
  );

  useEffect(
    () => {
      createRegionInteraction && createRegionInteraction.initializeSvg(svgRef.current, coordRanges.current);
    },
    /*dependencies=*/ [createRegionInteraction]
  );

  // Function to update the SVG.
  useEffect(
    () => {
      let svg = d3.select(svgRef.current);
      if (!vizData) return;

      d3Dots.current = drawToSVG(svg, vizData, vizTimespan, coordRanges.current, userDefinedStates);
      createRegionInteraction && createRegionInteraction.redraw();

      return () => {};
    },
    /*dependencies=*/ [vizData, vizTimespan, createRegionInteraction, userDefinedStates]
  );

  // Function to highlight points.
  useEffect(
    () => {
      if (!d3Dots.current || !highlightedPoints) return;

      let [lo, hi] = highlightedPoints;
      let matches = d3Dots.current.filter(d=>(lo <= d.Order && d.Order <= hi));
      matches.attr("fill", DOT_HIGHLIGHT_COLOR).attr("stroke", "black").raise();

      return () => {
        matches.attr("fill", DOT_COLOR).attr("stroke", null);
      };
    },
    /*deps=*/[vizData, vizTimespan, createRegionInteraction, highlightedPoints]
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
    height: 500,
    width: 800,
    marginRight: "0px",
    marginLeft: "0px",
    border: "solid 1px black",
  };
  const sliderDivStyle = { width: 400, margin: 50 };

  // Lol - this is probably a bad way to do it... Maybe should pull out
  // the class name 'def-visible' as a constant somewhere.
  let classNames =
    "viz-container debug" + (uistate.showViz() ? " def-visible" : "");

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

// Get information about the SVG's xy-coordinates should correspond to latitude/longitude
// based on the data table.
// Example:
// {
//   latitude: [24.4, 24.5],
//   svgX: [40, 400],
//   ...
// }
// Here, the graph on the SVG should be between pixels 40 and 400 (x-wise), and
// the latitudes corresponding to x=40 and x=400 are 24.4 and 24.5 respectively.
//
// NOTE: the latitude/longitude are scaled appropriately so that the data fits nicely
// in the graph and the XY distance is true-to-life.
function getCoordRanges(data) {
  // Note: we dilate the range by PADDING_FRACTION at the end so that we don't
  // plot data right on the axes. Of course, we could also constrict the svgX
  // and svgY range instead.
  let [latitude, longitude] = getLatLongDomain(
    d3.extent(data, (d) => d.Longitude),
    d3.extent(data, (d) => d.Latitude),
    [SVG_WIDTH, SVG_HEIGHT]
  ).map((rng) => scaleRange(rng, PADDING_FRACTION));

  let svgX = [SVG_MARGIN.LEFT, SVG_WIDTH - SVG_MARGIN.LEFT];
  let svgY = [SVG_HEIGHT - SVG_MARGIN.TOP, SVG_MARGIN.TOP];

  let ty = d3.scaleLinear().domain(svgY).range(latitude);
  let tx = d3.scaleLinear().domain(svgX).range(longitude);

  let py = d3.scaleLinear().domain(latitude).range(svgY);
  let px = d3.scaleLinear().domain(longitude).range(svgX);

  return {
    latitude,
    longitude,
    svgX,
    svgY,
    pxlToLatLong: (x, y) => [tx(x), ty(y)],
    longLatToPxl: (long, lat) => [px(long), py(lat)],
  };
}

function drawToSVG(svg, data, timespan, coordRanges, userDefinedStates) {
  let [width, height] = [SVG_EFFECTIVE_DIMS.WIDTH, SVG_EFFECTIVE_DIMS.HEIGHT];

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

  // Draw the current regions
  let longLatToPxl = coordRanges.longLatToPxl;
  let ellipses = userDefinedStates
    .filter(s=>s instanceof EllipseRegion)
    .map(s => {
      let [cx, cy] = longLatToPxl(s.cx, s.cy);
      let rx = longLatToPxl(s.cx + s.rx, s.cy)[0] - cx;
      let ry = longLatToPxl(s.cx, s.cy + s.ry)[1] - cy;
      [rx, ry] = [Math.abs(rx), Math.abs(ry)];
      return {cx, cy, rx, ry};
    });

  let regionElements = svg
    .selectAll("regionStates")
    .data(ellipses)
    .enter()
    .append("ellipse")
    .style("stroke", "black")
    .style("fill-opacity", 0.0)
    .attr("cx", d=>d.cx)
    .attr("cy", d=>d.cy)
    .attr("rx", d=>d.rx)
    .attr("ry", d=>d.ry);

  // Draw the trajectory. Based on:
  // https://www.d3-graph-gallery.com/graph/connectedscatter_basic.html
  svg = svg
    .append("g")
    .attr("transform", `translate(${SVG_MARGIN.LEFT}, ${SVG_MARGIN.RIGHT})`);

  var x = d3.scaleLinear().domain(coordRanges.longitude).range([0, width]);
  var y = d3.scaleLinear().domain(coordRanges.latitude).range([height, 0]);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).ticks(4));
  svg.append("g").call(d3.axisLeft(y).ticks(4));

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
        .x((d) => x(d.Longitude))
        .y((d) => y(d.Latitude))
    );

  let dots = svg
    .append("g")
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.Longitude))
    .attr("cy", (d) => y(d.Latitude))
    .attr("r", 3)
    .attr("fill", DOT_COLOR);
    // .on("click", selectPoint)
    // .on("mouseenter", (e) => {
    //   console.log("mouseenter event: ", e);
    // })
    // .on("mouseleave", (e) => {
    //   console.log("mouseleave event: ", e);
    // });

  regionElements.raise();
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
