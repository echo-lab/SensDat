import React, {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState,
} from "react";

import { ListGroup, Container, NavDropdown, Nav } from "react-bootstrap";

import { PXL_HEIGHT, PXL_WIDTH } from "../../utils/constants.js";

import * as d3 from "d3";

import { actions } from "./app-state.js";
import { RectRegion } from "./states/region.js";
import { BsSquare } from "react-icons/bs";

const SVG_ASPECT_RATIO = 8 / 5; // width/height

const DOT_COLOR = "#69b3a2";
const DOT_HIGHLIGHT_COLOR = "#91fd76";
const INVISIBLE_COLOR = "#00000000";
const PATH_COLOR = "#69b3a2";

// See: https://reactjs.org/docs/hooks-faq.html#how-can-i-measure-a-dom-node
// (Not sure if this use case is legit - I just didn't want to keep accessing
// ref.current lol)
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
  activeVizTab,
  dataTable,
  timeSeriesGraphs,
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
  siteLayout,
  setContainerHeight,
  dataRecorder,
  uiState,
}) {
  let handleCreateTimeGraph = (colName) =>
    dispatch(actions.createTimeSeriesGraph("TIME_SERIES_GRAPH:" + colName));
  const dataTableColumns = dataTable ? dataTable.getReactTableCols() : [];
  let [svg, svgRef] = useSvgRef();
  let [resetZoom, setResetZoom] = useState(() => () => {});
  const d3Dots = useRef();

  let svgWidth = dimensions.width * 0.95 || 500; // Default to 500 to avoid an error message
  let svgHeight = svgWidth / SVG_ASPECT_RATIO;

  useEffect(() => {
    setContainerHeight(svgHeight);
    // If nixing the timespan bar, do:
    // setContainerHeight(svgHeight + 70);
  }, [svgHeight, setContainerHeight]);

  // Some helper methods in case we change the order later. Note: svg must not be null to use.
  let [zoomG, dataG, regionsG, newRegionG] = useMemo(() => {
    if (!svg) return new Array(6).fill(null);
    let zoomG = svg.childNodes[0];
    return [
      zoomG,
      zoomG.childNodes[1],
      zoomG.childNodes[2],
      zoomG.childNodes[3],
      zoomG.childNodes[0].childNodes[0],
    ];
  }, [svg]);

  // Move the data to SVG-coordinates.
  let tData = useMemo(() => {
    if (activeVizTab === "BASE_TABLE") {
      return !vizData
        ? null
        : vizData.map(({ Longitude, Latitude, Timestamp, Order }) => {
            let [x, y] = currentTransform.transformPoint([Longitude, Latitude]);
            return { x, y, Timestamp, Order };
          });
    } else {
      const visTabSections = activeVizTab.split(":");
      const timeSeriesVisData = dataTable.getTimeSeriesVizData(
        visTabSections[1]
      );

      console.log(timeSeriesVisData);

      return timeSeriesVisData.map(({ DataToGraph, Timestamp, Order }) => {
        const isoDate =
          (Date.parse(Timestamp) - Date.parse(timeSeriesVisData[0].Timestamp)) /
          1000;
        const [x, oldY] = [isoDate, DataToGraph];
        const y = oldY * -1;
        return { x, y, Timestamp, Order };
      });
    }
  }, [activeVizTab, dataTable, vizData, currentTransform]);

  // Attach zoom listeners
  useEffect(() => {
    if (!svg) return;
    let reset = !dataRecorder
      ? attachZoomListeners(d3.select(svg), d3.select(zoomG))
      : () => {};
    setResetZoom(() => reset);
  }, [svg, zoomG, dataRecorder]);

  // Reset the zoom/pan if we get new data.
  useEffect(() => {
    if (!svg) return;
    resetZoom();
    d3.select(zoomG).on("click", (e) => {
      dataRecorder && dataRecorder.addPoint(d3.pointer(e));
    });
  }, [svg, zoomG, resetZoom, dataRecorder]);

  // Draw/redraw the data.
  // TODO: consider optimizing by redrawing the data points and path separately.
  useEffect(() => {
    if (!svg) return;
    let g = d3.select(dataG);
    d3Dots.current = drawData(g, tData, vizTimespan);
  }, [svg, dataG, tData, vizTimespan]);

  // Redraw the regions.
  useEffect(() => {
    if (!svg) return;
    let g = d3.select(regionsG);
    drawRegions(g, userDefinedStates);
  }, [svg, regionsG, userDefinedStates]);

  // This initializes the createRegionInteraction with the SVG.
  useEffect(() => {
    if (!svg || !createRegionInteraction) return;
    createRegionInteraction.initializeSvg(
      d3.select(svg),
      d3.select(newRegionG),
      [PXL_WIDTH / 2, PXL_WIDTH / 2]
    );
    resetZoom();
  }, [svg, newRegionG, createRegionInteraction, resetZoom]);

  // Function to highlight points.
  useEffect(
    () => {
      if (!d3Dots.current) return;

      console.log(d3Dots.current);

      let shownDoobs = d3Dots.current.filter(
        (d) => shownPoints[0] <= d.Order && d.Order <= shownPoints[1]
      );
      console.log(shownDoobs);

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

  // For viewBox: x y width height ?

  return (
    <Container className="viz-container" style={{ paddingLeft: "5px" }}>
      {timeSeriesGraphs.map((timeSeriesGraph) => {
        return <div key={timeSeriesGraph}>{timeSeriesGraph}</div>;
      })}
      <Nav variant="tabs" className="m-3" defaultActiveKey={"BASE_TABLE"}>
        <Nav.Item
          eventKey="BASE_TABLE"
          onClick={() => {
            dispatch(actions.selectTab("BASE_TABLE"));
          }}
        >
          <Nav.Link eventKey="BASE_TABLE">Base Table</Nav.Link>
        </Nav.Item>

        <NavDropdown
          title="+ New Time Series State"
          id="nav-dropdown"
          className="mx-2"
          disabled={uiState.busy()}
        >
          {dataTableColumns.map((dataTableColumn) => (
            <NavDropdown.Item
              onClick={() => handleCreateTimeGraph(dataTableColumn.Header)}
            >
              {dataTableColumn.Header}
            </NavDropdown.Item>
          ))}
        </NavDropdown>
      </Nav>
      <svg
        ref={svgRef}
        style={svgStyle}
        viewBox={`0 0 ${PXL_WIDTH} ${PXL_HEIGHT}`}
      >
        <g className="zoomG">
          <g className="siteLayoutG">
            <image />
          </g>
          <g className="dataG"></g>
          <g className="regionG"></g>
          <g className="newRegionG"></g>
        </g>
      </svg>
    </Container>
  );
}

// Attaches listeners for zoom/pan. Returns a function which
// resets the zoom/pan.
function attachZoomListeners(svg, g) {
  // Allow Zoom + Pan
  let handleZoom = (e) => g.attr("transform", e.transform);
  let zoom = d3
    .zoom()
    .scaleExtent([0.8, 3.0])
    .translateExtent([
      [-PXL_WIDTH / 2, -PXL_HEIGHT / 2],
      [1.5 * PXL_WIDTH, 1.5 * PXL_HEIGHT],
    ])
    .on("zoom", handleZoom);
  svg.call(zoom);
  return () => svg.call(zoom.transform, d3.zoomIdentity);
}

function drawData(g, data, timespan) {
  if (!data || data.length === 0) return;
  data = filterByTimespan(data, timespan);

  g.selectAll("*").remove();

  g.append();

  g.append("path")
    .attr("vector-effect", "non-scaling-stroke")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", PATH_COLOR)
    .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line()
        .x((d) => {
          return d.x;
        })
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

function drawRegions(g, userDefinedStates) {
  g.selectAll("*").remove();

  userDefinedStates
    .filter((s) => s instanceof RectRegion)
    .forEach((rect) => {
      let {
        center: [cx, cy],
        width,
        height,
        angle,
      } = rect.params;
      g.append("rect")
        .style("stroke", "black")
        .style("fill-opacity", 0.0)
        .attr("x", cx - width / 2)
        .attr("y", cy - height / 2)
        .attr("width", width)
        .attr("height", height)
        .attr("transform", `rotate(${angle} ${cx} ${cy})`);

      g.append("text")
        .attr("x", cx)
        .attr("y", cy - Math.abs(height) / 2 - 20)
        .attr("text-anchor", "middle")
        .attr("dy", "-.35em")
        .text(rect.name);
    });
}

// TODO: revisit this? I think we can assume we always have the actual time/Timestamp column
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

function RegionShapeSelector({ svgWidth, createRegionInteraction }) {
  // Note: this data is technically duplicated in createRegionInteraction,
  // but it's not ''Reactive''.
  let [shape, setShape] = useState(createRegionInteraction.shape);

  return (
    <ListGroup
      className="region-shape"
      style={{
        position: "absolute",
        top: 10,
        left: svgWidth - 50,
        opacity: 0.9,
      }}
    >
      <ListGroup.Item
        variant="light"
        action
        active={shape === "RECT"}
        onClick={(e) => {
          setShape("RECT");
          createRegionInteraction.useRect();
        }}
      >
        <BsSquare />
      </ListGroup.Item>
    </ListGroup>
  );
}
