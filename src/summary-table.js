import { useState, useMemo, forwardRef } from "react";

import Table from "react-bootstrap/Table";
import Dropdown from "react-bootstrap/Dropdown";
import Container from "react-bootstrap/Container";

import { COL_TYPES } from "./data-table.js";
import {
  TableStyles,
  hhmmss,
  timeDiffString,
  millisToTimeString,
  getSequenceInfo,
} from "./utils.js";

import "./styles/summary-table.css";
import { SequenceState } from "./states/sequence-state.js";

const SUMMARY_COLS = Object.freeze({
  CYCLE: "CYCLE",
  STATE: "STATE",
  STATES: "STATES",
  STATE_VALUE: "STATE_VALUE",
  START_TIME: "START_TIME",
  END_TIME: "END_TIME",
  NEXT_TIME: "NEXT_TIME",
  ELAPSED_TIME: "ELAPSED_TIME",
  ELAPSED_TIME_RAW: "ELAPSED_TIME_RAW",
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

const NO_STATES_STRING = "[None]";

export function SummaryTab({ table, state, highlightFn, userDefinedStates }) {
  let props = { table, state, highlightFn, userDefinedStates };
  return state instanceof SequenceState ? (
    <SequenceSummaryTab {...props} />
  ) : (
    <NormalSummaryTab {...props} />
  );
}

////////////////////////////////////////////////////////////////////////
// NORMAL (NON-SEQUENCE) SUMMARY
////////////////////////////////////////////////////////////////////////

function NormalSummaryTab({ table, state, highlightFn }) {
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
        Period
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item onClick={() => setTrueOnly(true)}>
          Show True Segments Only {trueOnly ? "✓" : ""}
        </Dropdown.Item>
        <Dropdown.Item onClick={() => setTrueOnly(false)}>
          Show True and False Segments {trueOnly ? "" : "✓"}
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
          {/* <th role="columnheader" className="add-col">
            <Button variant="outline-primary" size="sm" id="new-agg-col">
              +
            </Button>
          </th> */}
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
                  <td role="cell" key={idx} className={idx}>
                    {hhmmss(row[accessor])}
                  </td>
                );
              } else {
                return (
                  <td role="cell" key={idx} className={idx}>
                    {row[accessor]}
                  </td>
                );
              }
            })}
            {/* <td role="cell" className="add-col"></td> */}
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
          {/* <th role="columnheader" className="add-col">
            <Button variant="outline-primary" size="sm" id="new-total-agg-col">
              +
            </Button>
          </th> */}
        </tr>
      </thead>
      <tbody>
        <tr role="row">
          {cols.map(([key, _], idx) => (
            <td role="cell" key={idx}>
              {aggSummaryData[key]}
            </td>
          ))}
          {/* <td role="cell" className="add-col"></td> */}
        </tr>
      </tbody>
    </Table>
  );
}

export function getAggregateSummaryData(summaryBreakdown) {
  let breakdownRows = summaryBreakdown[1];
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

// TODO: Can probably revamp things to get rid of this and just use groupByState (!!!!!!)
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

////////////////////////////////////////////////////////////////////////
// SEQUENCE SUMMARY
////////////////////////////////////////////////////////////////////////

function SequenceSummaryTab({ table, state, highlightFn, userDefinedStates }) {
  let [trueOnly, setTrueOnly] = useState(false);
  let [showBreakdown, setShowBreakdown] = useState(true);
  let idToName = Object.fromEntries(
    userDefinedStates.map(({ id, name }) => [id, name])
  );

  let props = {
    trueOnly,
    showBreakdown,
    setTrueOnly,
    setShowBreakdown,
    table,
    seqState: state,
    idToName,
    highlightFn,
    allowDropdown: true,
  };
  return (
    <Container>
      <h4 className="mx-3"> Total </h4>
      <AggSequenceSummaryTable
        trueOnly={trueOnly}
        table={table}
        seqState={state}
        idToName={idToName}
      />
      <h4 className="mx-3"> Breakdown </h4>
      <TableStyles>
        <SequenceSummaryTable {...props}></SequenceSummaryTable>
      </TableStyles>
    </Container>
  );
}

function SequenceStateDropdown({
  name,
  trueOnly,
  showBreakdown,
  setTrueOnly,
  setShowBreakdown,
}) {
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
        {name}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item onClick={() => setTrueOnly(!trueOnly)}>
          Show Points in State Only {trueOnly && "✓"}
        </Dropdown.Item>
        <Dropdown.Item onClick={() => setShowBreakdown(!showBreakdown)}>
          Show Each Part of Sequence {showBreakdown && "✓"}
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}

export function SequenceSummaryTable({
  trueOnly,
  showBreakdown,
  setTrueOnly,
  setShowBreakdown,
  table,
  seqState,
  idToName,
  highlightFn,
  allowDropdown,
  nameOverride,
}) {
  let [highlightedRows, setHighlightedRows] = useState([-1, -1]);
  let [highlightSeqNum, setHighlightSeqNum] = useState(false);

  let [cols, rows] = useMemo(
    () =>
      getSequenceSummaryData({
        trueOnly,
        showBreakdown,
        table,
        seqState,
        idToName,
      }),
    [trueOnly, showBreakdown, table, seqState, idToName]
  );

  let onMouseEnterRow = (row, idx) => {
    setHighlightSeqNum(false);
    setHighlightedRows([idx, idx]);
    highlightFn([row.range]);
  };
  let onMouseEnterSeqNum = (row, idx) => {
    setHighlightSeqNum(true);
    let lo = idx - row.prevSeq + 1;
    let hi = idx + row.nextSeq - 1;
    setHighlightedRows([lo, hi]);
    highlightFn([[rows[lo].range[0], rows[hi].range[1]]]);
  };
  let onMouseLeave = () => {
    setHighlightSeqNum(false);
    setHighlightedRows([-1, -1]);
    highlightFn([]);
  };

  let getClassForSeqNumCell = (idx) => {
    return (highlightSeqNum || !showBreakdown) && highlightedRows[0] === idx
      ? "highlighted"
      : "";
  };
  let getClassForNormalCell = (idx, contents) => {
    let res = [];
    let [lo, hi] = highlightedRows;
    if (lo <= idx && idx <= hi) res.push("highlighted");
    if (contents === NO_STATES_STRING) res.push("faded");
    return res.join(" ");
  };

  let dropdownProps = {
    name: seqState.name,
    trueOnly,
    showBreakdown,
    setTrueOnly,
    setShowBreakdown,
  };

  return (
    <Table>
      <thead>
        <tr role="row">
          <th role="columnheader">
            {allowDropdown ? (
              <SequenceStateDropdown {...dropdownProps} />
            ) : (
              nameOverride || seqState.name
            )}
          </th>
          {cols.map(
            (col, idx) =>
              col.accessor !== "seqNum" && (
                <th key={idx} role="columnheader">
                  {col.Header}
                </th>
              )
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ridx) => (
          <tr role="row" key={ridx}>
            {/* The sequence number, which might span multiple rows */}
            {(ridx === 0 || row.seqNum !== rows[ridx - 1].seqNum) && (
              <td
                role="cell"
                rowSpan={row.nextSeq}
                className={getClassForSeqNumCell(ridx)}
                onMouseEnter={() => onMouseEnterSeqNum(row, ridx)}
                onMouseLeave={onMouseLeave}
              >
                {row.seqNum > 0 ? row.seqNum : "--"}
              </td>
            )}
            {/* The rest of the row */}
            {cols.map(
              ({ accessor }, cIdx) =>
                row[accessor] !== undefined &&
                accessor !== "seqNum" && (
                  <td
                    role="cell"
                    key={cIdx}
                    className={getClassForNormalCell(ridx, row[accessor])}
                    onMouseEnter={() => onMouseEnterRow(row, ridx)}
                    onMouseLeave={onMouseLeave}
                  >
                    {TIME_COLS.includes(accessor)
                      ? hhmmss(row[accessor])
                      : row[accessor]}
                  </td>
                )
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function AggSequenceSummaryTable({ trueOnly, table, seqState, idToName }) {
  let [cols, rows] = useMemo(
    () => getAggSequenceSummaryData({ trueOnly, table, seqState, idToName }),
    [trueOnly, table, seqState, idToName]
  );

  return (
    <TableStyles>
      <Table>
        <thead>
          <tr role="row">
            {cols.map((col, idx) => (
              <th key={idx} role="columnheader">
                {col.Header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ridx) => (
            <tr role="row" key={ridx}>
              {cols.map(({ accessor }, cIdx) => (
                <td role="cell" key={cIdx}>
                  {row[accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </TableStyles>
  );
}

function getAggSequenceSummaryData({ trueOnly, table, seqState, idToName }) {
  let [cols, rows] = getSequenceSummaryData({
    trueOnly: false,
    showBreakdown: false,
    table,
    seqState,
    idToName,
  });
  console.log("starting data is: ", cols, rows);

  let hasDist = cols.at(-1).accessor === SUMMARY_COLS.DISTANCE;

  let resCols = [
    { Header: cols[0].Header, accessor: "inState" },
    { Header: "Occurrences", accessor: "occurrences" },
    { Header: "Total Time", accessor: "totalTime" },
    { Header: "Average Time", accessor: "averageTime" },
  ];
  if (hasDist) {
    resCols.push({ Header: "Total Distance", accessor: "totalDist" });
  }

  let resRows = [];
  let sumList = (L) => L.reduce((prev, cur) => prev + cur, 0);

  for (let inState of trueOnly ? [true] : [true, false]) {
    let rs = rows.filter((r) => (r.seqNum !== -1) === inState);
    let durs = rs.map((r) => r[SUMMARY_COLS.ELAPSED_TIME_RAW]);

    let dists = hasDist ? rs.map((r) => r[SUMMARY_COLS.DISTANCE]) : [];

    resRows.push({
      inState: inState ? "True" : "False",
      occurrences: durs.length,
      totalTime: millisToTimeString(sumList(durs)),
      averageTime:
        durs.length > 0
          ? millisToTimeString(sumList(durs) / durs.length)
          : "N/A",
      totalDist: round(sumList(dists), 3),
    });
  }

  console.log("Ending is: ", resCols, resRows);

  return [resCols, resRows];
}

// Ultimately returns [cols, rows] to render.
// The cols looks like [{Header: "Name of col", accessor: "key_in_row"}, ...].
// And the rows are just objects mapping the column keys to their values. Note: rows may have extra information
// for rendering, for example "nextSeq" is used to display the sequence number across multiple rows.
function getSequenceSummaryData({
  trueOnly,
  showBreakdown,
  table,
  seqState,
  idToName,
}) {
  // STEP 1:
  //   Group by states and label each row w/ the sequence number
  //   e.g., [{states: [12], range: [lo, hi], seqNum: 2}, ...]

  // [{states: [...], range: [1, 243]}, ...]
  let byStates = groupByStates(
    table,
    seqState.states.map((id) => ({ id }))
  );

  let seq = byStates.map((x) => JSON.stringify(x.states));
  let target = seqState.sequence.map(JSON.stringify);
  let seqInfo = getSequenceInfo(seq, target);
  // [{seqNum: -1, nextSeq: 1, prevSeq: 1}, {seqNum: 1}, {seqNum: 2}, {seqNum: -1}, ...]

  let getPrettyState = (states) =>
    states.length === 0
      ? NO_STATES_STRING
      : states.map((id) => idToName[id]).join(", ");

  let rows = byStates.map((row, idx) => ({
    ...row,
    ...seqInfo[idx],
    prettyStates: getPrettyState(row.states),
    nextSeq: 1, // reset so we can recalculate
    prevSeq: 1, // reset so we can recalculate
  }));

  // STEP 2:
  //   If trueOnly, get rid of rows outside of the sequence.
  //   If !showBreakdown, smooth together rows with the same sequence number.
  //   Finally, calculate prevSeq and nextSeq for the new set of data. This last part is used for rendering.
  if (trueOnly) {
    rows = rows.filter(({ seqNum }) => seqNum >= 0);
  }
  if (!showBreakdown) {
    // Squish rows together that have the same sequence number
    let newRows = [];
    for (let row of rows) {
      let prevRow = newRows.at(-1);
      if (!prevRow || prevRow.seqNum !== row.seqNum) {
        newRows.push(row);
      } else {
        prevRow.range[1] = row.range[1];
      }
    }
    rows = newRows;
  }
  // Recalculate prevSeq and nextSeq
  for (let i = rows.length - 2; i >= 0; i--) {
    if (rows[i].seqNum === rows[i + 1].seqNum) {
      rows[i].nextSeq = rows[i + 1].nextSeq + 1;
    }
  }
  for (let i = 1; i < rows.length; i++) {
    if (rows[i - 1].seqNum === rows[i].seqNum) {
      rows[i].prevSeq = rows[i - 1].prevSeq + 1;
    }
  }

  // STEP 3:
  //   Get the start time, elapsed time, and total distance for each row. (i.e., the aggregation functions).
  //   Assemble everything into a list of columns and rows to be used for rendering.
  let groupByCols = [
    { Header: seqState.name, accessor: "seqNum", maybeSpanning: true },
  ];
  showBreakdown &&
    groupByCols.push({ Header: "State(s)", accessor: "prettyStates" });

  let [aggCols, aggRows] = calcAggregateFunctions(
    table,
    rows.map((r) => r.range)
  );

  let cols = [...groupByCols, ...aggCols];
  rows = rows.map((row, idx) => ({
    ...row,
    ...aggRows[idx],
  }));

  return [cols, rows];
}

////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////

// Helper functions
function getTime(dataTable, idx) {
  let idxAccessor = dataTable.getAccessor(COL_TYPES.INDEX);
  let row = dataTable.rows.find((x) => x[idxAccessor] === idx);

  let timeAccessor = dataTable.getAccessor(COL_TYPES.T_CLEAN);
  return row && timeAccessor ? row[timeAccessor] : null;
}

// TODO: rewrite other functions to use this :)
// Returns, for example:
//   [
//      {states: [132], range: [0, 10]},
//      {state: [132, 421], range: [11, 50]},
//      {state: [443], range: [51, 60]},
//       ...
//   ]
export function groupByStates(table, states) {
  if (!table.rows || table.rows.length === 0) return [];

  const indexAccessor = table.getAccessor(COL_TYPES.INDEX);
  const index = (row) => row[indexAccessor];

  const getTrueStates = (row) =>
    states.filter((s) => row[s.id] === "true").map((s) => s.id);

  const allEq = (l1, l2) =>
    l1.length === l2.length && l1.every((v, i) => v === l2[i]);

  let r0 = table.rows[0];
  let res = [
    {
      states: getTrueStates(r0),
      range: [index(r0), index(r0)],
    },
  ];

  for (let row of table.rows) {
    let curr = getTrueStates(row);
    if (allEq(res.at(-1).states, curr)) {
      // Our state is the same, so we just update the end of the range.
      res.at(-1).range[1] = index(row);
    } else {
      // Our state changed, so we need to add a new item to the result.
      res.push({ states: curr, range: [index(row), index(row)] });
    }
  }
  return res;
}

// TODO: rewrite other functions to use this :)
// given the ranges of points, calculates the aggregate functions
export function calcAggregateFunctions(table, ranges) {
  let cols = [
    { Header: "Start Time", accessor: SUMMARY_COLS.START_TIME },
    { Header: "Total Time", accessor: SUMMARY_COLS.ELAPSED_TIME },
  ];
  let hasDistCol = table.getColByType(COL_TYPES.DIST);
  if (hasDistCol)
    cols.push({ Header: "Total Distance", accessor: SUMMARY_COLS.DISTANCE });

  let rows = ranges.map(([lo, hi], idx) => {
    let tStart = getTime(table, lo);
    let tNext = getTime(table, hi + 1);
    if (!tNext) {
      let tHi = getTime(table, hi);
      let tPrev = getTime(table, hi - 1);
      let dt = tHi.getTime() - tPrev.getTime();
      tNext = new Date(tHi.getTime() + dt);
    }
    let res = {
      [SUMMARY_COLS.START_TIME]: tStart,
      [SUMMARY_COLS.ELAPSED_TIME]: timeDiffString(tStart, tNext),
      [SUMMARY_COLS.ELAPSED_TIME_RAW]: tNext.getTime() - tStart.getTime(),
    };
    if (hasDistCol) {
      res[SUMMARY_COLS.DISTANCE] = getDistance(table, lo, hi);
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

function round(num, precision) {
  return Math.round(Math.pow(10, precision) * num) / Math.pow(10, precision);
}
