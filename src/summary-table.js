import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";

import { COL_TYPES } from "./data-table.js";
import { hhmmss, timeDiffString } from "./utils.js";

const SUMMARY_COLS = Object.freeze({
  CYCLE: "CYCLE",
  STATE: "STATE",
  START_TIME: "START_TIME",
  END_TIME: "END_TIME",
  NEXT_TIME: "NEXT_TIME",
  ELAPSED_TIME: "ELAPSED_TIME",
  DISTANCE: "DISTANCE",
});

const TIME_COLS = [SUMMARY_COLS.START_TIME, SUMMARY_COLS.END_TIME];

export function SummaryTable({ table, state, highlightFn }) {
  let [cols, rows] = getBreakdownByTF(table, state);

  return (
    <Table hover>
      <thead>
        <tr role="row">
          {cols.map((col, idx) => (
            <th key={idx} role="columnheader">
              {col.Header}
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
                  <td role="cell" key={idx} rowSpan={row["cycleRowspan"] || 1}>
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
      cycle: 1,
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
function getBreakdownByTF(table, state) {
  let hasDistCol = table.getColByType(COL_TYPES.DIST);
  let cols = [
    { Header: "Cycle", accessor: SUMMARY_COLS.CYCLE },
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
    let tNext;  // The time the next stretch starts...
    if (idx !== cycleRanges.length - 1) {
      tNext = getTime(table, cycleRange.range[1] + 1);
    } else {
      // Guess the time of the next point based on the current sampling rate.
      let dt = tEnd.getTime() - getTime(table, endIdx-1).getTime();
      tNext = new Date(tEnd.getTime() + dt);  
    }
    let res = {
      [SUMMARY_COLS.STATE]:
        cycleRange.state === "true" ? state.name : `NOT ${state.name}`,
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

// function getBreakdownByWholeCycle(table, state) {
//   let cols = [
//     {Header: "Cycle", accessor: "cycle"},
//     {Header: "State", accessor: "state"},
//     {Header: "Start Time", accessor: "startTime"},
//     {Header: "End Time", accessor: "endTime"},
//   ];
//
//   let cycleRanges = getCycleRanges(table, state);
//
//   // TODO: do this...
// }
