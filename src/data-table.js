import * as Papa from "papaparse";

const TEST_DATA = [
  "test_data",
  "demo_data_student",
  "demo_data_classroom",
  "demo_data_classroom_clean"
].map(
  (s) => `${process.env.PUBLIC_URL}/${s}.csv`
);

const COL_TYPES = Object.freeze({
    INDEX:   "index",       // not used
    X:  "x",                // not used
    Y: "y",                 // not used
    STATE: "state",         // represents a user-defined T-F state
    STATE_TMP: "state_tmp"  // represents a temporary state
});

export class DataTable {
  /*
   * rows:
   *   the data rows, of the form {colName: value, ...}
   * colTypes:
   *   A mapping from column names to column types. Eventually, all
   *   columns should have a type, but for now, we just need
   *   an 'INDEX', 'X', and 'Y' column.
   */
  constructor(rows, colTypes) {
    if (!rows) return;

    // TODO: if we don't use the original row names, we can handle duplicates?
    this.rows = rows;
    this.cols = Object.entries(rows[0]).map(([key, _]) => ({
      displayName: key,
      accessor: key,
      type: colTypes[key],
    }));
    this.stateToTrueRanges = {};

    this.cacheVizData();
  }

  cacheVizData() {
    this.vizData = this.rows.map(row => ({
      Order: row.Order,
      Latitude: row.Latitude,
      Longitude: row.Longitude,
    }));
  }

  getTempCol() {
    // returns null or col object, i.e., {displayName, accessor, type}
    let res = this.cols.filter(col => col.type === COL_TYPES.STATE_TMP);
    return res.length > 0 ? res[0] : null;
  }

  // NOTE: This returns a NEW DataTable (!!)
  withTempState(state) {
    let result = this.copy();
    let tmpCol = this.getTempCol();

    // Filter out any current temp-state columns and add the new one.
    result.cols = result.cols.filter(col => col.type !== COL_TYPES.STATE_TMP);
    result.cols.push({displayName: state.name, accessor: state.id, type: COL_TYPES.STATE_TMP});

    // Get the values for our new state. Note: this can't necessarily be done
    // row-by-row (e.g., for compound states).
    let values = state.getValues(result.rows);

    // Filter out values for the old temp state (if they exist), and populate w/
    // the new one.
    result.rows = result.rows.map((row, idx) => {
      tmpCol && delete row[tmpCol.accessor];
      row[state.id] = values[idx];
      return row;
    });
    return result;
  }

  // NOTE: This returns a NEW DataTable (!!)
  withoutTempState() {
    let result = this.copy();
    let tmpCol = result.getTempCol();
    if (!tmpCol) return result;

    result.cols = result.cols.filter(col => col.type !== COL_TYPES.STATE_TMP);
    result.rows = result.rows.map(row => {
      delete row[tmpCol.accessor];
      return row;
    });
    return result;
  }

  // NOTE: This returns a NEW DataTable (!!)
  withCommittedTempState() {
    if (!this.getTempCol()) return this;

    let result = this.copy();
    result.cols = result.cols.map(col => {
      col.type = col.type === COL_TYPES.STATE_TMP ? COL_TYPES.STATE : col.type;
      return col;
    });
    result.cacheStateData();
    return result;
  }

  withDeletedStates(states) {
    let res = this.copy();

    let toDeleteIDs = states.map(s=>s.id);
    res.cols = res.cols.filter(col => !toDeleteIDs.includes(col.accessor));
    res.rows = res.rows.map(r => {
      toDeleteIDs.forEach(id=>delete r[id]);
      return r;
    });

    res.stateToTrueRanges = {};
    res.cacheStateData();
    return res;
  }

  cacheStateData() {
    for (let col of this.cols) {
      if (col.type !== COL_TYPES.STATE) continue;
      this.stateToTrueRanges[col.accessor] = this.getTrueRanges(col.accessor);
    }
  }

  getTrueRanges(stateID) {
    if (!this.cols.some(c=>c.accessor === stateID)) return [];
    if (this.stateToTrueRanges.hasOwnProperty(stateID)) return this.stateToTrueRanges[stateID];

    let res = [];
    for (let row of this.rows) {
      if (row[stateID] !== "true") continue;
      let i = row.Order;
      if (res.length === 0 || res.at(-1)[1] !== i-1) {
        res.push([i, i]);
      } else {
        res.at(-1)[1] = i;
      }
    }
    this.stateToTrueRanges[stateID] = res;
    return res;
  }

  get length() {
    return this.rows.length;
  }

  getReactTableCols() {
    return this.cols.map(c => {
      let col = {
        Header: c.displayName,
        accessor: c.accessor,
      };
      if (c.type === "INDEX") col.width = 60;
      return col;
    });
  }

  getReactTableData() {
    return this.rows;
  }

  copy() {
    let res = new DataTable();
    res.rows = this.rows;
    res.cols = this.cols;
    res.vizData = this.vizData;
    res.stateToTrueRanges = this.stateToTrueRanges;
    return res;
  }

  asObject() {
    return {rows: this.rows, cols: this.cols};
  }

  static fromObject(o) {
    let res = new DataTable();
    res.rows = o.rows;
    res.cols = o.cols;
    res.stateToTrueRanges = {};
    res.cacheVizData();
    res.cacheStateData();
    return res;
  }

  static FromTestData(i) {
    i = Number.isInteger(i) ? i % TEST_DATA.length : TEST_DATA.length - 1;
    const fName = TEST_DATA[i];
    const colMapping = { Order: "INDEX", Longitude: "X", Latitude: "Y" };

    return new Promise((resolve, reject) => {
      Papa.parse(fName, {
        download: true,
        dynamicTyping: true,
        header: true,
        skipEmptyLines: true,
        error: (e) => reject(e),
        complete: (res) => {
          resolve(new DataTable(res.data, colMapping));
        },
      });
    });
  }
}
