import React from "react";

import { DropdownButton, Dropdown } from "react-bootstrap";

import { CreateTimespanWidget } from "./timespan-state-panel.js";
import { actions } from "./app-state.js";
import { LatitudeLongitudeVizView } from "./longitude-latitude-viz-view.js";
import { TimeSeriesVizView } from "./time-series-viz-view.js";

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
  const longLatVizViewProps = {
    dataTable,
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
  };

  const timeSeriesVizViewProps = {
    activeVizTab,
    dataTable,
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
  };

  let handleCreateTimeGraph = (colName) =>
    dispatch(actions.createTimeSeriesGraph("TIME_SERIES_GRAPH:"+ colName));

  const displayTimeSeries = (activeVizTab) => {
    if (activeVizTab === "BASE_TABLE") {
      return <LatitudeLongitudeVizView {...longLatVizViewProps} />;
    } else if (activeVizTab.startsWith("TIME_SERIES_GRAPH")) {
      return <TimeSeriesVizView {...timeSeriesVizViewProps} />;
    }
  };

  const dataTableColumns = 
    dataTable ? dataTable.getReactTableCols() : []
  ;

  return (
    <div>
      <DropdownButton
        variant="outline-primary"
        size="sm"
        id="dropdown-basic-button"
        title="+ New Time Series State"
        className="mx-2"
        disabled={uiState.busy()}
      >
        {dataTableColumns.map((dataTableColumn) => (
          <Dropdown.Item
            onClick={() => handleCreateTimeGraph(dataTableColumn.Header)}
          >
            {dataTableColumn.Header}
          </Dropdown.Item>
        ))}
      </DropdownButton>
      {displayTimeSeries(activeVizTab)}
    </div>
  );
}
