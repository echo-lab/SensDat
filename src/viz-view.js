import React, {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState,
} from "react";

import Container from "react-bootstrap/Container";

import * as Slider from "rc-slider";
import "rc-slider/assets/index.css";

import * as d3 from "d3";
import debounce from "lodash.debounce";

import { actions } from "./app-state.js";
import { EllipseRegion } from "./states/region.js";
import { hhmmss } from "./utils.js";
import { UIState } from "./ui-state.js";
import { DataEditor } from "./viz-data-editor.js";

import { PXL_HEIGHT, PXL_WIDTH } from "./constants.js";

const SVG_ASPECT_RATIO = 8 / 5; // width/height
// If we want axes, use the commented out versions
// const SVG_MARGIN = { TOP: 30, RIGHT: 30, BOTTOM: 30, LEFT: 50 };
// const PADDING_FRACTION = 1.1; // How much to pad the data w.r.t. the graph axes.
const SVG_MARGIN = { TOP: 30, RIGHT: 30, BOTTOM: 30, LEFT: 30 };
const PADDING_FRACTION = 1.0; // How much to pad the data w.r.t. the graph axes.

const DOT_COLOR = "#69b3a2";
const DOT_HIGHLIGHT_COLOR = "#91fd76";
const INVISIBLE_COLOR = "#00000000";
const PATH_COLOR = "#69b3a2";

const createSliderWithTooltip = Slider.createSliderWithTooltip;
const Range = createSliderWithTooltip(Slider.Range);

// See: https://reactjs.org/docs/hooks-faq.html#how-can-i-measure-a-dom-node
// (Not sure if this use case is legit lol)
function useSvgRef() {
  const [svg, setSvg] = useState(null);
  const ref = useCallback((node) => node !== null && setSvg(node), []);
  return [svg, ref];
}

/*
 * Creates a visualization of the data.
 *
 * Args:
 * - vizData:
 *      A list of objects like: [{Order, Latitude, Longitude, Timestamp}, ...].
 *      Should come from DataTable.getVizData()
 * - vizTimespan:
 *      A range [x, y] where 0 <= x <= y < = 100.
 */
export function VizView({
  vizData,
  vizTimespan,
  dispatch,
  createRegionInteraction,
  highlightedPoints,
  shownPoints,
  useShownPoints,
  userDefinedStates,
  defaultTransform,
  currentTransform,
  dimensions,
  uiState,
}) {
  let [svg, svgRef] = useSvgRef();
  let [resetZoom, setResetZoom] = useState(() => () => {});
  const d3Dots = useRef();

  let svgWidth = dimensions.width * 0.97 || 500; // Default to 500 to avoid an error message
  let svgHeight = svgWidth / SVG_ASPECT_RATIO;

  // TODO: get rid of this :)
  let svgCoordMapping = useMemo(
    () => (vizData ? getSvgCoordMapping(vizData, PXL_WIDTH, PXL_HEIGHT) : null),
    [vizData]
  );

  // Move the data to SVG-coordinates.
  let tData = useMemo(
    () =>
      vizData.map(({ Longitude, Latitude, Timestamp, Order }) => {
        let [x, y] = currentTransform.transformPoint([Longitude, Latitude]);
        return { x, y, Timestamp, Order };
      }),
    [vizData, currentTransform]
  );

  // Attach zoom listeners
  useEffect(() => {
    if (!svg) return;
    let reset = attachZoomListeners(
      d3.select(svg),
      d3.select(svg.childNodes[0])
    );
    setResetZoom(() => reset);
  }, [svg]);

  // Reset the zoom/pan if we get new data.
  useEffect(() => {
    resetZoom();
  }, [svg, vizData]);

  // Draw/redraw the data.
  // TODO: consider optimizing by not redrawing the points
  useEffect(() => {
    if (!svg) return;
    let g = d3.select(svg.childNodes[0].childNodes[0]);
    d3Dots.current = drawData(g, tData, vizTimespan);
  }, [svg, tData, vizTimespan]);

  // Redraw the regions.
  useEffect(() => {
    if (!svg) return;
    // TODO: redraw the regions
    let g = d3.select(svg.childNodes[0].childNodes[1]);
    drawRegions(g, userDefinedStates, svgCoordMapping);
  }, [svg, userDefinedStates, svgCoordMapping]);

  // Function to update the SVG.
  useEffect(
    () => {
      if (!vizData || !svg) return;

      createRegionInteraction &&
        createRegionInteraction.redraw(svgCoordMapping);

      return () => {};
    },
    /*dependencies=*/ [
      svg,
      vizData,
      vizTimespan,
      createRegionInteraction,
      userDefinedStates,
      currentTransform,
    ]
  );

  // This initializes the createRegionInteraction with the SVG.
  useEffect(
    () => {
      if (!svg) return;
      createRegionInteraction &&
        createRegionInteraction.initializeSvg(
          svg,
          svg.childNodes[0],
          svgCoordMapping
        );
    },
    /*dependencies=*/ [createRegionInteraction]
  );

  // Function to highlight points.
  useEffect(
    () => {
      if (!d3Dots.current) return;

      let shownDoobs = d3Dots.current.filter(
        (d) => shownPoints[0] <= d.Order && d.Order <= shownPoints[1]
      );
      useShownPoints &&
        shownDoobs.attr("fill", DOT_COLOR).attr("stroke", "black").raise();

      let highlightPoints = highlightedPoints || [];

      let highlights = d3Dots.current.filter((d) =>
        highlightPoints.some(([lo, hi]) => lo <= d.Order && d.Order <= hi)
      );
      highlights
        .attr("fill", DOT_HIGHLIGHT_COLOR)
        .attr("stroke", "black")
        .attr("r", 3.5)
        .raise();

      return () => {
        useShownPoints &&
          shownDoobs.attr("fill", INVISIBLE_COLOR).attr("stroke", null);
        highlights
          .attr("fill", INVISIBLE_COLOR)
          .attr("stroke", null)
          .attr("r", 3);
      };
    },
    // Note: the dependencies are such that we need to rerun this whenever d3Dots
    // changes OR when the set of shown/highlighted points changes.
    /*deps=*/ [
      vizData,
      vizTimespan,
      createRegionInteraction,
      userDefinedStates,
      highlightedPoints,
      shownPoints,
      useShownPoints,
    ]
  );

  // TODO: Figure out what these should be and probably move them.
  const svgStyle = {
    height: svgHeight,
    width: svgWidth,
    marginRight: "0px",
    marginLeft: "0px",
    border: "solid 1px black",
  };

  const dataEditorProps = {
    data: vizData,
    defaultTransform,
    currentTransform,
    dispatch,
  };

  let timeSliderProps = { vizData, vizTimespan, svgWidth, dispatch };
  let timeSlider = useMemo(() => {
    return vizData ? <TimeSlider {...timeSliderProps} /> : null;
  }, [vizData, vizTimespan, svgWidth]);

  return (
    <Container className="viz-container" style={{ paddingLeft: "5px" }}>
      <button
        type="button"
        class="btn btn-sm btn-link"
        onClick={(e) => {
          e.preventDefault();
          dispatch(actions.startEditData());
        }}
      >
        Edit Datapoints
      </button>
      <svg
        ref={svgRef}
        style={svgStyle}
        viewBox={`0 0 ${PXL_WIDTH} ${PXL_HEIGHT}`}
      >
        <g class="zoomG">
          <g class="dataG"></g>
          <g class="regionG"></g>
        </g>
      </svg>
      {timeSlider}
      {uiState === UIState.MoveDataPoints && (
        <DataEditor {...dataEditorProps} />
      )}
    </Container>
  );
}

// TODO: would this be simpler to just... implement without a library??
function TimeSlider({ vizData, vizTimespan, svgWidth, dispatch }) {
  // TODO: Figure out how to do this w/ 'marks' instead of tooltips.
  let tipFormatter = useMemo(() => {
    let [tMin, tMax] = d3.extent(vizData, (d) => d.Timestamp.getTime());
    return (val) =>
      hhmmss(new Date(tMin + (val / vizData.length) * (tMax - tMin)));
  }, [vizData]);

  if (!vizData) return null;

  let rangeProps = {
    max: vizData.length,
    defaultValue: [0, vizData.length],
    allowCross: false,
    draggableTrack: true,
    onChange: debounce((val) => dispatch(actions.changeTimespan(val)), 18),
    tipFormatter,
  };

  const sliderDivStyle = {
    width: svgWidth - 150, // TODO: fix this - it's a weird magic value
    margin: 50,
  };

  return (
    <div style={sliderDivStyle}>
      <p>Timespan</p>
      <Range {...rangeProps} />
    </div>
  );
}

// Attaches listeners for zoom/pan. Returns a function which
// resets the zoom/pan.
function attachZoomListeners(svg, g) {
  // Allow Zoom + Pan
  let handleZoom = (e) => g.attr("transform", e.transform);
  let zoom = d3
    .zoom()
    .scaleExtent([0.5, 3.0])
    .translateExtent([
      [-PXL_WIDTH / 2, -PXL_HEIGHT / 2],
      [1.5 * PXL_WIDTH, 1.5 * PXL_HEIGHT],
    ])
    .on("zoom", handleZoom);
  svg.call(zoom);
  return () => svg.call(zoom.transform, d3.zoomIdentity);
}

function drawData(g, data, timespan) {
  data = filterByTimespan(data, timespan);

  g.selectAll("*").remove();

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", PATH_COLOR)
    .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line()
        .x((d) => d.x)
        .y((d) => d.y)
    );

  let dots = g
    .append("g") // Do we need this?
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", 3)
    .attr("fill", INVISIBLE_COLOR);

  return dots;
}

function drawRegions(g, userDefinedStates, { longToX, latToY }) {
  let regions = g
    .selectAll("regionStates")
    .data(userDefinedStates.filter((s) => s instanceof EllipseRegion))
    .enter()
    .append("g");

  regions
    .append("ellipse")
    .style("stroke", "black")
    .style("fill-opacity", 0.0)
    .attr("cx", (d) => longToX(d.cx))
    .attr("cy", (d) => latToY(d.cy))
    .attr("rx", (d) => Math.abs(longToX(d.cx + d.rx) - longToX(d.cx)))
    .attr("ry", (d) => Math.abs(latToY(d.cy + d.ry) - latToY(d.cy)));

  regions
    .append("text")
    .attr("x", (d) => longToX(d.cx))
    .attr("y", (d) => latToY(d.cy + d.ry))
    .attr("text-anchor", "middle")
    .attr("dy", "-.35em")
    .text((d) => d.name);
}

/* ----------------- */
/* UTILITY FUNCTIONS */
/* ----------------- */

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
    svgX,
    svgY,
    xToLong: d3.scaleLinear().domain(svgX).range(longitude),
    yToLat: d3.scaleLinear().domain(svgY).range(latitude),
    longToX: d3.scaleLinear().domain(longitude).range(svgX),
    latToY: d3.scaleLinear().domain(latitude).range(svgY),
  };
}

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
  // Note sure if this is good or not :)
  if (data[0].Timestamp) {
    let [minTime, maxTime] = d3.extent(data, (d) => d.Timestamp.getTime());
    let [r1, r2] = timespan;
    let t1 = minTime + (r1 / data.length) * (maxTime - minTime);
    let t2 = minTime + (r2 / data.length) * (maxTime - minTime);
    return data.filter(
      (row) => row.Timestamp.getTime() >= t1 && row.Timestamp.getTime() <= t2
    );
  }

  let [minOrder, maxOrder] = d3.extent(data, (d) => d.Order);
  let [r1, r2] = timespan;
  let mno = minOrder + (r1 / data.length) * (maxOrder - minOrder);
  let mxo = minOrder + (r2 / data.length) * (maxOrder - minOrder);
  return data.filter((row) => row.Order >= mno && row.Order <= mxo);
}
