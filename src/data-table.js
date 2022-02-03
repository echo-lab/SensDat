import * as Papa from "papaparse";

const TEST_DATA = ["test_data", "demo_data_student", "demo_data_classroom"].map(
  (s) => `${process.env.PUBLIC_URL}/${s}.csv`
);

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
    this.rows = rows;
    this.cols = Object.entries(rows[0]).map(([key, _]) => ({
      displayName: key,
      accessor: key,
      type: colTypes[key],
    }));
  }

  get length() {
    return this.rows.length;
  }

  getReactTableCols() {
    return this.cols.map(c => {
      let res = {
        Header: c.displayName,
        accessor: c.accessor,
      };
      if (c.type === "INDEX") res.width = 60;
      return res;
    });
  }

  getReactTableData() {
    return this.rows;
  }

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
