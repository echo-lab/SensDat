import * as Papa from "papaparse";
import "any-date-parser";

import { hhmmss } from "./utils.js";

const TEST_DATA = [
  "test_data",
  "demo_data_student",
  "demo_data_classroom",
  "demo_data_classroom_clean"
].map(
  (s) => `${process.env.PUBLIC_URL}/${s}.csv`
);

export const COL_TYPES = Object.freeze({
    INDEX: "index",
    X:  "x",                // i.e., longitude
    Y: "y",                 // i.e., latitude
    T: "t",                 // the timestamp
    T_CLEAN: "t_clean",     // the timestamp, in DateTime format, interpolated to the second.
    STATE: "state",         // represents a user-defined T-F state
    STATE_TMP: "state_tmp"  // represents a temporary state
});

const COL_ORDER = [
  COL_TYPES.INDEX,
  COL_TYPES.X,
  COL_TYPES.Y,
  COL_TYPES.T_CLEAN,
  COL_TYPES.T,
  undefined,  // LOL, dirty hack.
  COL_TYPES.STATE,
  COL_TYPES.STATE_TMP,
];

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
    this.sortColumns();
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

  getColByType(type) {
    let res = this.cols.filter(c=>c.type === type);
    return res.length > 0 ? res[0] : null;
  }

  sortColumns() {
    let cols = this.cols;
    let nextIdx = 0;
    for (let ctype of COL_ORDER) {
      for (let j = nextIdx; j < cols.length; j++) {
        if (cols[j].type !== ctype) continue;
        // Else: we found a column of the correct type, and we need to swap it back
        for (let k = j; k > nextIdx; k--) {
          [cols[k], cols[k-1]] = [cols[k-1], cols[k]];
        }
        nextIdx++;
      }
    }
  }

  // NOTE: Returns a NEW DataTable
  withColumnTypes(colTypes) {
    // console.log(Date.fromString("11/11/2021 03:22:21 PM"));
    // d.setTime(d.getTime() + (h*60*60*1000));
    // Can get the offset: d.getTimezoneOffset(); lol. terrible!

    let res = this.copy();
    res.cols = res.cols.map(col=>({
        ...col,
        type: colTypes[col.accessor] || col.type,
    }));

    res = res.withCleanedTime();
    res.sortColumns();
    return res;
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

  withCleanedTime() {
    let tCol = this.getColByType(COL_TYPES.T);
    if (!tCol || this.getColByType(COL_TYPES.T_CLEAN)) return this;

    let times = this.rows.map(r => {
      let t = Date.fromString(r[tCol.accessor]);
      // Interpret it in the current timezone instead of GMT...
      t.setTime(t.getTime() + (t.getTimezoneOffset() * 60 * 1000));
      return t;
    });

    // Now we interpolate...
    // This definitely assumes stuff....
    for (let i = 0; i < times.length-1; i++) {
      if (times[i].getTime() !== times[i+1].getTime()) continue;
      // OKAY: The times are the same, so we need to interpolate...
      let j = i+1;
      while (j < times.length && times[j].getTime() === times[j-1].getTime()) {
        j++;
      }
      // Target time is either: the next different time OR a minute later, if
      // we're at the end.
      let start = times[i].getTime();
      let target = j < times.length ? times[j].getTime() : times[i].getTime() + 60*1000;
      for (let k = 1; k < (j-i); k++ ){
        let t = start + (k / (j-i)) * (target - start);
        times[i+k].setTime(t);
      }
      i = j;
    }

    let res = this.copy();
    let newCol = {displayName: "Time", accessor: "CLEANED_TIME", type: COL_TYPES.T_CLEAN};
    res.cols = [...res.cols, newCol]; //.splice(3, 0, newCol);
    res.rows = res.rows.map((row, idx)=>({
      ...row,
      CLEANED_TIME: times[idx],
    }));
    res.sortColumns();
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
      if (c.type === COL_TYPES.INDEX) col.width = 60;

      // Need to tell React Table how to render the timestamp column
      if (c.type === COL_TYPES.T_CLEAN) {
        col.Cell = ({cell: { value } }) => hhmmss(value);
      }
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
    let tsCol = this.getColByType(COL_TYPES.T_CLEAN);
    if (!tsCol) {
      return {rows: this.rows, cols: this.cols};
    }

    // We need to serialize the timestamp...
    let rows = this.rows.map(r=> ({
      ...r,
      [tsCol.accessor]: r[tsCol.accessor].toGMTString(),
    }));
    return {rows, cols: this.cols};
  }

  static fromObject(o) {
    let res = new DataTable();
    res.rows = o.rows;
    res.cols = o.cols;

    // Deserialize the timestamp column
    let tsCol = res.getColByType(COL_TYPES.T_CLEAN);
    if (tsCol) {
      res.rows = res.rows.map(r=>({
        ...r,
        [tsCol.accessor]: Date.fromString(r[tsCol.accessor]),
      }));
    }

    res.stateToTrueRanges = {};
    res.cacheVizData();
    res.cacheStateData();
    return res;
  }

  // onSuccess: passed a new table, with no lat/long/time/order columns specified
  static FromFile(file, {onError, onSuccess}) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      error: onError,
      complete: (res) => {
        onSuccess(new DataTable(res.data, {}));
      },
    });
  }

  static FromTestData(i) {
    i = Number.isInteger(i) ? i % TEST_DATA.length : TEST_DATA.length - 1;
    const fName = TEST_DATA[i];
    const colMapping = {
      Order: COL_TYPES.INDEX,
      Longitude: COL_TYPES.X,
      Latitude: COL_TYPES.Y,
      "Date Created": COL_TYPES.T,
    };

    return new Promise((resolve, reject) => {
      Papa.parse(fName, {
        download: true,
        dynamicTyping: true,
        header: true,
        skipEmptyLines: true,
        error: (e) => reject(e),
        complete: (res) => {
          resolve(new DataTable(res.data, colMapping).withCleanedTime());
        },
      });
    });
  }
}
