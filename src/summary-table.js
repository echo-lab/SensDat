import Table from 'react-bootstrap/Table';

// Accessor for the index row. Probably should live in the DataTable object.
const INDEX = "Order";


export function SummaryTable({table, state, highlightFn}) {

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
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
            <tr
              role="row" key={idx}
              onClick={()=>highlightFn([row.pointsRange])}
              onMouseEnter={()=>highlightFn([row.pointsRange])}
              onMouseLeave={()=>highlightFn([])}
            >
              {cols.map(({accessor}, idx)=> {
                if (!row[accessor]) return null;
                if (accessor === "cycle") {
                  return (
                    <td role="cell" key={idx} rowSpan={row["cycleRowspan"] || 1}>
                      {row[accessor]}
                    </td>
                  );
                }
                return (
                  <td role="cell" key={idx}>
                    {row[accessor]}
                  </td>
                );
              })}
            </tr>
          ))}
      </tbody>
    </Table>
  );
}

// Helper functions
function getTime(dataTable, idx) {
  let row = dataTable.rows.find(x=>x[INDEX]===idx);
  return row ? row["Date Created"] : null;
}

// Returns cycle ranges broken down by T/F.
// For example: [{cycle: 1, state: false, range: [1, 23]}, ...]
function getCycleRanges(table, state) {
  if (!table.rows || table.rows.length === 0) return [];

  let r0 = table.rows[0];
  let res = [{
    cycle: 1,
    state: r0[state.id],
    range: [r0[INDEX], r0[INDEX]],
  }];

  for (let row of table.rows) {
    if (res.at(-1).state === row[state.id]) {
      // Our state is the same, so we just update the end of the range.
      res.at(-1).range[1] = row[INDEX];
    } else {
      // Our state changed, so we need to add a new item to the result.
      res.push({
        cycle: res.at(-1).cycle + (row[state.id] === "true" ? 1 : 0),
        state: row[state.id],
        range: [row[INDEX], row[INDEX]],
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
//     pointsRange: [startIdx, endIdx],
//     cycle: <number> | null  // null if previous row's cell has rowspan 2
//     cycleRowspan: 2 | 1 | null
//   }]
function getBreakdownByTF(table, state) {
  let cols = [
    {Header: "Cycle", accessor: "cycle"},
    {Header: "State", accessor: "state"},
    {Header: "Start Time", accessor: "startTime"},
    {Header: "End Time", accessor: "endTime"},
  ];

  let cycleRanges = getCycleRanges(table, state);

  let rows = cycleRanges.map((cycleRange, idx) => {
    let res = {
      state: (cycleRange.state === "true" ? state.name : `NOT ${state.name}`),
      startTime: getTime(table, cycleRange.range[0]),
      endTime: getTime(table, cycleRange.range[1]),
      pointsRange: cycleRange.range,
    };

    // Populate 'cycle' and 'cycleRowspan' conditionally.
    let prev = (idx > 0 ? cycleRanges[idx-1] : null);
    let next = (cycleRanges.length > idx+1 ? cycleRanges[idx+1] : null);
    if (!prev || prev.cycle !== cycleRange.cycle) {
      // This is the first row of the cycle.
      res.cycle = cycleRange.cycle;
      // If the next entry has the same cycle, make the rowspan 2.
      res.cycleRowspan = (next && next.cycle === cycleRange.cycle ? 2 : 1);
    }

    return res;
  });

  return [cols, rows];
}

function getBreakdownByWholeCycle(table, state) {
  let cols = [
    {Header: "Cycle", accessor: "cycle"},
    {Header: "State", accessor: "state"},
    {Header: "Start Time", accessor: "startTime"},
    {Header: "End Time", accessor: "endTime"},
  ];

  let cycleRanges = getCycleRanges(table, state);

  // TODO: do this...



}
