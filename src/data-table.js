import * as Papa from "papaparse";

const TEST_DATA = ["test_data", "demo_data_student", "demo_data_classroom"].map(
  (s) => `${process.env.PUBLIC_URL}/${s}.csv`
);

const TEMP_STATE_KEY = "TEMP_STATE_KEY";  // hope this isn't in the CSV lol

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
    this.tempCol = null;

    this.colTypes = colTypes;  // Do we need this?
  }

  // NOTE: This returns a NEW DataTable (!!)
  withTempState(stateName, calculateStateFxn) {
    let result = new DataTable();
    result.rows = this.rows;
    result.cols = this.cols;
    result.colTypes = this.colTypes;

    result.tempCol = {
      name: stateName,
      values: this.rows.map(row=>calculateStateFxn(row)),
    };
    return result;
  }

  // NOTE: This returns a NEW DataTable (!!)
  withoutTempState() {
    if (this.tempCol === null) return this;
    return new DataTable(this.rows, this.colTypes);
  }

  // NOTE: This returns a NEW DataTable (!!)
  withCommittedTempState(stateName) {
    // In short: we are moving the tempCol data into the real cols/rows.
    if (this.tempCol === null) return this;

    // TODO: make sure stateName is unique !

    let rows = this.rows.map((row, idx) => ({
      ...row,
      [stateName]: this.tempCol.values[idx],
    }));
    return new DataTable(rows, this.colTypes);
  }

  get length() {
    return this.rows.length;
  }

  getReactTableCols() {
    let res = this.cols.map(c => {
      let col = {
        Header: c.displayName,
        accessor: c.accessor,
      };
      if (c.type === "INDEX") col.width = 60;
      return col;
    });
    if (this.tempCol !== null) {
      res.push({
        Header: this.tempCol.name,
        accessor: TEMP_STATE_KEY,  // TODO: can we just use the name?
      });
    }
    return res;
  }

  getReactTableData() {
    if (this.tempCol === null) return this.rows;

    return this.rows.map((row, idx) => ({
        ...row,
        TEMP_STATE_KEY: this.tempCol.values[idx],
    }));
  }

  // TODO: should this also return the tempCol data??
  data() {
    return this.rows;
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
