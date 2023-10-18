import React, {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState,
} from "react";

import { Container, ListGroup, Dropdown } from "react-bootstrap";

import * as Slider from "rc-slider";

import * as d3 from "d3";

import { CreateTimespanWidget } from "./timespan-state-panel.js";
import { actions } from "./app-state.js";
import { EllipseRegion, RectRegion } from "./states/region.js";
import { UIState } from "./ui-state.js";
import { DataEditor } from "./viz-data-editor.js";
import { UploadLayoutWidget } from "./upload-layout.js";
import { BsSquare, BsCircle, BsGearFill } from "react-icons/bs";

import { PXL_HEIGHT, PXL_WIDTH } from "./constants.js";
import { EditBox } from "./edit-box.js";

const SVG_ASPECT_RATIO = 8 / 5; // width/height

const DOT_COLOR = "#69b3a2";
const DOT_HIGHLIGHT_COLOR = "#91fd76";
const INVISIBLE_COLOR = "#00000000";
const PATH_COLOR = "#69b3a2";
const DEFAULT_OPACITY_PERCENT = 20;

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
export function LatitudeLongitudeVizView({
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
  let [svg, svgRef] = useSvgRef();
  let [resetZoom, setResetZoom] = useState(() => () => {});
  const d3Dots = useRef();

  let svgWidth = dimensions.width * 0.95 || 500; // Default to 500 to avoid an error message
  let svgHeight = svgWidth / SVG_ASPECT_RATIO;

  useEffect(() => {
    setContainerHeight(svgHeight + 200);
    // If nixing the timespan bar, do:
    // setContainerHeight(svgHeight + 70);
  }, [svgHeight, setContainerHeight]);

  // Some helper methods in case we change the order later. Note: svg must not be null to use.
  let [zoomG, dataG, regionsG, newRegionG, siteLayoutImageTag] = useMemo(() => {
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
    return !vizData
      ? null
      : vizData.map(({ Longitude, Latitude, Timestamp, Order }) => {
          let [x, y] = currentTransform.transformPoint([Longitude, Latitude]);
          return { x, y, Timestamp, Order };
        });
  }, [vizData, currentTransform]);

  let reverseTransform = useMemo(() => {
    if (!currentTransform) {
      return null;
    }
    let revTransform = new EditBox(
      currentTransform.currentParams,
      currentTransform.initialParams
    );
    return (xy) => revTransform.transformPoint(xy);
  }, [currentTransform]);

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
      dataRecorder && dataRecorder.addPoint(reverseTransform(d3.pointer(e)));
    });
  }, [
    svg,
    zoomG,
    resetZoom,
    vizData,
    siteLayout,
    currentTransform,
    reverseTransform,
    dataRecorder,
  ]);

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
      [PXL_WIDTH / 2, PXL_HEIGHT / 2]
    );
    resetZoom();
  }, [svg, newRegionG, createRegionInteraction]);

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

  // Draw the site layout, if it exists.
  useEffect(() => {
    if (svg === null) return;
    siteLayout
      ? drawSiteLayout(d3.select(siteLayoutImageTag), siteLayout)
      : d3.select(siteLayoutImageTag).attr("width", 0).attr("height", 0);
  }, [svg, siteLayoutImageTag, siteLayout]);

  let setLayoutOpacity = useMemo(() => {
    if (!siteLayout || !svg) return null;
    return (val) => d3.select(siteLayoutImageTag).attr("opacity", val / 100);
  }, [svg, siteLayout, siteLayoutImageTag]);

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
    siteLayout,
    dispatch,
  };

  // Memoize to prevent re-rendering and resetting the slider.
  let timespanWidget = useMemo(
    () => (
      <CreateTimespanWidget
        vizData={vizData}
        dispatch={dispatch}
        takenNames={userDefinedStates.map((s) => s.name)}
      />
    ),
    [vizData, svgWidth, dispatch]
  );
  timespanWidget = uiState === UIState.CreateTimespan && timespanWidget;

  return (
    <Container className="viz-container" style={{ paddingLeft: "5px" }}>
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
      <SettingsWidgets
        svgWidth={svgWidth}
        setLayoutOpacity={setLayoutOpacity}
        createRegionInteraction={createRegionInteraction}
        uiState={uiState}
        dispatch={dispatch}
      />
      {timespanWidget}
      {uiState === UIState.MoveDataPoints && (
        <DataEditor {...dataEditorProps} />
      )}
      {uiState === UIState.UploadLayout && (
        <UploadLayoutWidget dispatch={dispatch} />
      )}
    </Container>
  );
}

// Contains 1-3 widgets:
//  1) gear+drop-down for uploading site layout or manipulationg data
//  2) slider for site layout opacity, if there's a site layout
//  3) The shape-selector, if we're currently creating a new region
function SettingsWidgets({
  svgWidth,
  setLayoutOpacity,
  createRegionInteraction,
  uiState,
  dispatch,
}) {
  let clickEditDatapoints = (e) => {
    e.preventDefault();
    dispatch(actions.startEditData());
  };

  let clickUploadLayout = (e) => {
    e.preventDefault();
    dispatch(actions.startUploadLayout());
  };

  return (
    <>
      <Dropdown
        className="position-absolute no-arrow settings-gear"
        align="start"
        style={{ top: 5, left: 10 }}
      >
        <Dropdown.Toggle
          variant="light"
          id="dropdown-basic"
          disabled={uiState.busy()}
        >
          <BsGearFill />
        </Dropdown.Toggle>

        <Dropdown.Menu>
          <Dropdown.Item onClick={clickEditDatapoints}>
            Edit Data Points
          </Dropdown.Item>
          <Dropdown.Item onClick={clickUploadLayout}>
            Upload Site Layout
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
      {setLayoutOpacity && (
        <Slider.default
          defaultValue={DEFAULT_OPACITY_PERCENT}
          onChange={setLayoutOpacity}
          vertical={true}
          style={{
            position: "absolute",
            top: 70,
            left: 25,
            height: 50,
          }}
        />
      )}
      {createRegionInteraction && (
        <RegionShapeSelector
          createRegionInteraction={createRegionInteraction}
          svgWidth={svgWidth}
        />
      )}
    </>
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

function drawSiteLayout(imageTag, siteLayout) {
  let { x, y, height, width } = siteLayout.idealSVGParams(
    PXL_WIDTH,
    PXL_HEIGHT
  );
  imageTag
    .attr("href", siteLayout.url)
    .attr("width", width)
    .attr("height", height)
    .attr("opacity", DEFAULT_OPACITY_PERCENT / 100)
    .attr("x", x)
    .attr("y", y);
}

function drawRegions(g, userDefinedStates) {
  g.selectAll("*").remove();
  // TODO: move this stuff into the EllipseRegion class, maybe?
  userDefinedStates
    .filter((s) => s instanceof EllipseRegion)
    .forEach((ellipse) => {
      g.append("ellipse")
        .style("stroke", "black")
        .style("fill-opacity", 0.0)
        .attr("cx", ellipse.cx)
        .attr("cy", ellipse.cy)
        .attr("rx", ellipse.rx)
        .attr("ry", ellipse.ry)
        .attr(
          "transform",
          `rotate(${ellipse.angle} ${ellipse.cx} ${ellipse.cy})`
        );

      g.append("text")
        .attr("x", ellipse.cx)
        .attr("y", ellipse.cy - ellipse.ry - 20)
        .attr("text-anchor", "middle")
        .attr("dy", "-.35em")
        .text(ellipse.name);
    });

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
        active={shape === "ELLIPSE"}
        onClick={(e) => {
          setShape("ELLIPSE");
          createRegionInteraction.useEllipse();
        }}
      >
        <BsCircle />
      </ListGroup.Item>
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
