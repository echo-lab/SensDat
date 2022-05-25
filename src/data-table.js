import * as Papa from "papaparse";

const TEST_DATA = ["test_data", "demo_data_student", "demo_data_classroom"].map(
  (s) => `${process.env.PUBLIC_URL}/${s}.csv`
);

const COL_TYPES = Object.freeze({
    INDEX:   Symbol("index"),       // not used
    X:  Symbol("x"),                // not used
    Y: Symbol("y"),                 // not used
    STATE: Symbol("state"),         // represents a user-defined T-F state
    STATE_TMP: Symbol("state_tmp")  // represents a temporary state
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
  }

  getTempCol() {
    // returns null or col object, i.e., {displayName, accessor, type}
    let res = this.cols.filter(col => col.type == COL_TYPES.STATE_TMP);
    return res.length > 0 ? res[0] : null;
  }

  // NOTE: This returns a NEW DataTable (!!)
  withTempState(stateName, calculateStateFxn) {
    let result = this.copy();
    let tmpCol = this.getTempCol();

    // Filter out any current temp-state columns and add the new one.
    result.cols = result.cols.filter(col => col.type != COL_TYPES.STATE_TMP);
    result.cols.push({displayName: stateName, accessor: stateName, type: COL_TYPES.STATE_TMP});

    // Filter out values for the old temp state (if they exist), and populate w/
    // the new one.
    result.rows = result.rows.map(row => {
      tmpCol && delete row[tmpCol.accessor];
      row[stateName] = calculateStateFxn(row);
      return row;
    });
    return result;
  }

  // NOTE: This returns a NEW DataTable (!!)
  withoutTempState() {
    let result = this.copy();
    let tmpCol = result.getTempCol();
    if (!tmpCol) return result;

    result.cols = result.cols.filter(col => col.type != COL_TYPES.STATE_TMP);
    result.rows = result.rows.map(row => {
      delete row[tmpCol.accessor];
      return row;
    });
    return result;
  }

  // NOTE: This returns a NEW DataTable (!!)
  withCommittedTempState(stateName) {
    if (!this.getTempCol()) return this;

    let result = this.copy();
    result.cols = result.cols.map(col => {
      if (col.type == COL_TYPES.STATE_TMP) {
        col.type = COL_TYPES.STATE;
      }
      return col;
    });
    return result;
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

  data() {
    return this.rows;
  }

  copy() {
    let res = new DataTable();
    res.rows = this.rows;
    res.cols = this.cols;
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
        error: (e) => reject(e),
        complete: (res) => {
          resolve(new DataTable(res.data, colMapping));
        },
      });
    });
  }
}
