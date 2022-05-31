
// Accessor for the index row. Probably should live in the DataTable object.
const INDEX = "Order";

export class SummaryTable {

  constructor(table, state) {
    // Step 1) construct a "cycleBreakdown", which looks like:
    // {true: [low_idx, high_idx], false: [low_idx, high_idx]}.
    // That is, each "cycle" is broken up into the "true" portion and the
    // "false" portion, in that order, and we want to calculate the bounds for
    // which points fall in that cycle. Bounds are inclusive.
    this.cycleBreakdown = [{true: null, false: null}];

    let id = state.id;
    let prevVal = table.rows[0][id] === "true";
    let curCycle = this.cycleBreakdown[0];
    curCycle[prevVal] = [table.rows[0][INDEX], table.rows[0][INDEX]];

    for (let row of table.rows) {
      let val = row[id] === "true";  // sad...
      let idx = row[INDEX];

      if (prevVal === val) {
        curCycle[val][1] = idx;  // change the upper bound
      } else if (prevVal && !val) {
        curCycle[false] = [idx, idx];
      } else if (!prevVal && val) {
        curCycle = {true: [idx, idx], false: null};
        this.cycleBreakdown.push(curCycle);
      }
      prevVal = val;
    }

    // Step 2) define the columns and rows which will be displayed.
    this.cols = [
      {Header: "Cycle", accessor: "cycle"},
      {Header: "Start Time", accessor: "start_time"},
      {Header: "End Time", accessor: "end_time"},
    ];

    this.rows = this.cycleBreakdown.map((cycle, idx) => ({
      cycle: idx+1,
      start_time: getStartTime(cycle, table),
      end_time: getEndTime(cycle, table),
    }));
  }

  getReactTableCols() {
    return this.cols;
  }

  getReactTableData() {
    return this.rows;
  }
}

// Helper functions for calculating aggregate statistics.
function getStartTime(cycle, dataTable) {
  let idx = cycle[true] ? cycle[true][0] : cycle[false][0];
  let row = dataTable.rows.find(x=>x[INDEX]===idx);  // slow
  return row ? row["Date Created"] : null;
}

function getEndTime(cycle, dataTable) {
  let idx = cycle[false] ? cycle[false][1] : cycle[true][1];
  let row = dataTable.rows.find(x=>x[INDEX]===idx);  // slow
  return row ? row["Date Created"] : null;
}
