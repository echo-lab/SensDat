import { useState, useMemo, forwardRef } from "react";

import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
import Container from "react-bootstrap/Container";

import { COL_TYPES } from "./data-table.js";
import {
  TableStyles,
  hhmmss,
  timeDiffString,
  millisToTimeString,
} from "./utils.js";

import "./summary-table.css";

const SUMMARY_COLS = Object.freeze({
  CYCLE: "CYCLE",
  STATE: "STATE",
  STATE_VALUE: "STATE_VALUE",
  START_TIME: "START_TIME",
  END_TIME: "END_TIME",
  NEXT_TIME: "NEXT_TIME",
  ELAPSED_TIME: "ELAPSED_TIME",
  DISTANCE: "DISTANCE",
});

const AGG_SUMMARY = Object.freeze({
  VISITS: "VISITS",
  TOTAL_DURATION: "TOTAL_DURATION",
  AVG_DURATION: "AVG_DURATION",
  TOTAL_DISTANCE: "TOTAL_DISTANCE",
  TOTAL_OUTSIDE_DURATION: "TOTAL_OUTSIDE_DURATION",
});

const TIME_COLS = [SUMMARY_COLS.START_TIME, SUMMARY_COLS.END_TIME];

export function SummaryTab({ table, state, highlightFn }) {
  let [trueOnly, setTrueOnly] = useState(true);
  let summaryBreakdown = useMemo(
    () => getBreakdownByTF(table, state),
    [table, state]
  );
  let aggSummaryData = getAggregateSummaryData(summaryBreakdown);
  let props = { summaryBreakdown, highlightFn, trueOnly, setTrueOnly };
  return (
    <Container>
      <h4 className="mx-3"> Total </h4>
      <TableStyles>
        <AggregateSummary aggSummaryData={aggSummaryData} />
      </TableStyles>
      <h4 className="mx-3"> Breakdown </h4>
      <TableStyles>
        <SummaryTable {...props}></SummaryTable>
      </TableStyles>
    </Container>
  );
}

function SummaryModeDropdown({ trueOnly, setTrueOnly }) {
  const CustomToggle = forwardRef(({ children, onClick }, ref) => (
    <span
      ref={ref}
      className="mx-1 dropdown-toggle"
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
    >
      {children}
    </span>
  ));

  return (
    <Dropdown>
      <Dropdown.Toggle as={CustomToggle} id="dropdown-summary-mode">
        Visit
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item onClick={() => setTrueOnly(true)}>
          Show Only Visits ('True' Segments) {trueOnly ? "✓" : ""}
        </Dropdown.Item>
        <Dropdown.Item onClick={() => setTrueOnly(false)}>
          Show 'False' Segments Between Visits {trueOnly ? "" : "✓"}
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}

export function SummaryTable({
  summaryBreakdown,
  highlightFn,
  trueOnly,
  setTrueOnly,
}) {
  let [cols, rows] = summaryBreakdown;

  let summaryModeProps = { trueOnly, setTrueOnly };

  if (trueOnly) {
    rows = rows.filter((r) => r[SUMMARY_COLS.STATE_VALUE] === true);
  }

  return (
    <Table hover>
      <thead>
        <tr role="row">
          {cols.map((col, idx) => (
            <th key={idx} role="columnheader">
              {col.Header === "Period" ? (
                <SummaryModeDropdown {...summaryModeProps} />
              ) : (
                col.Header
              )}
            </th>
          ))}
          <th role="columnheader" className="add-col">
            <Button variant="outline-primary" size="sm" id="new-agg-col">
              +
            </Button>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr
            role="row"
            key={idx}
            onClick={() => highlightFn([row.pointsRange])}
            onMouseEnter={() => highlightFn([row.pointsRange])}
            onMouseLeave={() => highlightFn([])}
          >
            {cols.map(({ accessor }, idx) => {
              if (row[accessor] === undefined) return null;
              if (accessor === SUMMARY_COLS.CYCLE) {
                return (
                  <td
                    role="cell"
                    key={idx}
                    rowSpan={trueOnly ? 1 : row["cycleRowspan"] || 1}
                  >
                    {row[accessor]}
                  </td>
                );
              } else if (TIME_COLS.includes(accessor)) {
                return (
                  <td role="cell" key={idx}>
                    {hhmmss(row[accessor])}
                  </td>
                );
              } else {
                return (
                  <td role="cell" key={idx}>
                    {row[accessor]}
                  </td>
                );
              }
            })}
            <td role="cell" className="add-col"></td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function AggregateSummary({ aggSummaryData }) {
  let hasDistance = aggSummaryData[AGG_SUMMARY.TOTAL_DISTANCE] !== undefined;

  // list of [key, name] pairs.
  let cols = [
    [AGG_SUMMARY.VISITS, "Visits"],
    [AGG_SUMMARY.TOTAL_DURATION, "Time in State"],
    [AGG_SUMMARY.AVG_DURATION, "Average time in State"],
    [AGG_SUMMARY.TOTAL_OUTSIDE_DURATION, "Time Outside State"],
  ];
  if (hasDistance) cols.push([AGG_SUMMARY.TOTAL_DISTANCE, "Total Distance"]);

  return (
    <Table>
      <thead>
        <tr role="row">
          {cols.map(([_, name], idx) => (
            <th key={idx} role="columnheader" className={_}>
              {name}
            </th>
          ))}
          <th role="columnheader" className="add-col">
            <Button variant="outline-primary" size="sm" id="new-total-agg-col">
              +
            </Button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr role="row">
          {cols.map(([key, _], idx) => (
            <td role="cell" key={idx}>
              {aggSummaryData[key]}
            </td>
          ))}
          <td role="cell" className="add-col"></td>
        </tr>
      </tbody>
    </Table>
  );
}

// Helper functions
function getTime(dataTable, idx) {
  let idxAccessor = dataTable.getAccessor(COL_TYPES.INDEX);
  let row = dataTable.rows.find((x) => x[idxAccessor] === idx);

  let timeAccessor = dataTable.getAccessor(COL_TYPES.T_CLEAN);
  return row && timeAccessor ? row[timeAccessor] : null;
}

// Returns cycle ranges broken down by T/F.
// For example: [{cycle: 1, state: false, range: [1, 23]}, ...]
function getCycleRanges(table, state) {
  if (!table.rows || table.rows.length === 0) return [];

  const indexAccessor = table.getAccessor(COL_TYPES.INDEX);
  const index = (row) => row[indexAccessor];

  let r0 = table.rows[0];
  let res = [
    {
      cycle: r0[state.id] === "true" ? 1 : 0,
      state: r0[state.id],
      range: [index(r0), index(r0)],
    },
  ];

  for (let row of table.rows) {
    if (res.at(-1).state === row[state.id]) {
      // Our state is the same, so we just update the end of the range.
      res.at(-1).range[1] = index(row);
    } else {
      // Our state changed, so we need to add a new item to the result.
      res.push({
        cycle: res.at(-1).cycle + (row[state.id] === "true" ? 1 : 0),
        state: row[state.id],
        range: [index(row), index(row)],
      });
    }
  }
  return res;
}

// Returns [cols, rows] for rendering.
// cols:
//   [{Header, accessor}, ...]
// rows:
//   [{
//     state: "NOT <state name>" | "<state name>"
//     startTime: <string>,
//     endTime: <string>,
//     nextCycleTime: <string> (??)
//     pointsRange: [startIdx, endIdx],
//     cycle: <number> | null  // null if previous row's cell has rowspan 2
//     cycleRowspan: 2 | 1 | null
//   }]
export function getBreakdownByTF(table, state) {
  let hasDistCol = table.getColByType(COL_TYPES.DIST);
  let cols = [
    { Header: "Period", accessor: SUMMARY_COLS.CYCLE },
    { Header: "State", accessor: SUMMARY_COLS.STATE },
    { Header: "Start Time", accessor: SUMMARY_COLS.START_TIME },
    // { Header: "End Time", accessor: SUMMARY_COLS.END_TIME },
    { Header: "Total Time", accessor: SUMMARY_COLS.ELAPSED_TIME },
  ];
  if (hasDistCol)
    cols.push({ Header: "Total Distance", accessor: SUMMARY_COLS.DISTANCE });

  let cycleRanges = getCycleRanges(table, state);

  let rows = cycleRanges.map((cycleRange, idx) => {
    let [startIdx, endIdx] = cycleRange.range;
    let tStart = getTime(table, startIdx);
    let tEnd = getTime(table, endIdx);
    let tNext; // The time the next stretch starts...
    if (idx !== cycleRanges.length - 1) {
      tNext = getTime(table, cycleRange.range[1] + 1);
    } else {
      // Guess the time of the next point based on the current sampling rate.
      let dt = tEnd.getTime() - getTime(table, endIdx - 1).getTime();
      tNext = new Date(tEnd.getTime() + dt);
    }
    let res = {
      [SUMMARY_COLS.STATE]:
        cycleRange.state === "true" ? state.name : `NOT ${state.name}`,
      [SUMMARY_COLS.STATE_VALUE]: cycleRange.state === "true",
      [SUMMARY_COLS.START_TIME]: tStart,
      [SUMMARY_COLS.END_TIME]: tEnd,
      [SUMMARY_COLS.NEXT_TIME]: tNext,
      [SUMMARY_COLS.ELAPSED_TIME]: timeDiffString(tStart, tNext),
      pointsRange: cycleRange.range,
    };
    if (hasDistCol) {
      res[SUMMARY_COLS.DISTANCE] = getDistance(table, ...cycleRange.range);
    }

    // Populate 'cycle' and 'cycleRowspan' conditionally.
    let prev = idx > 0 ? cycleRanges[idx - 1] : null;
    let next = cycleRanges.length > idx + 1 ? cycleRanges[idx + 1] : null;
    if (!prev || prev.cycle !== cycleRange.cycle) {
      // This is the first row of the cycle.
      res[SUMMARY_COLS.CYCLE] = cycleRange.cycle;
      // If the next entry has the same cycle, make the rowspan 2.
      res.cycleRowspan = next && next.cycle === cycleRange.cycle ? 2 : 1;
    }

    return res;
  });

  return [cols, rows];
}

function getDistance(table, idx0, idx1) {
  const indexAccessor = table.getAccessor(COL_TYPES.INDEX);
  const index = (row) => row[indexAccessor];

  const distAccessor = table.getAccessor(COL_TYPES.DIST);

  let precision = 1e3;
  return (
    Math.round(
      precision *
        table.rows
          .filter((row) => idx0 < index(row) && index(row) <= idx1)
          .reduce((prev, row) => prev + row[distAccessor], 0)
    ) / precision
  );
}

export function getAggregateSummaryData(summaryBreakdown) {
  let [_, breakdownRows] = summaryBreakdown;
  // Change the format
  let rows = breakdownRows.map((r) => ({
    state: r[SUMMARY_COLS.STATE_VALUE] === true,
    durationMSecs:
      r[SUMMARY_COLS.NEXT_TIME].getTime() -
      r[SUMMARY_COLS.START_TIME].getTime(),
    distance: r[SUMMARY_COLS.DISTANCE], // possibly undefined.
  }));
  let trueRows = rows.filter((r) => r.state === true);

  let res = {};

  let totalMSecs = trueRows.reduce((prev, cur) => prev + cur.durationMSecs, 0);

  res[AGG_SUMMARY.VISITS] = trueRows.length;
  res[AGG_SUMMARY.TOTAL_DURATION] = millisToTimeString(totalMSecs);
  res[AGG_SUMMARY.AVG_DURATION] = millisToTimeString(
    trueRows.length > 0 ? totalMSecs / trueRows.length : 0
  );
  res[AGG_SUMMARY.TOTAL_OUTSIDE_DURATION] = millisToTimeString(
    rows
      .filter((r) => r.state === false)
      .reduce((prev, cur) => prev + cur.durationMSecs, 0)
  );
  let distance = trueRows.reduce(
    (prev, cur) =>
      cur["distance"] ? cur["distance"] + (prev || 0) : undefined,
    undefined
  );
  if (distance)
    res[AGG_SUMMARY.TOTAL_DISTANCE] = Math.round(1e3 * distance) / 1e3;
  return res;
}
