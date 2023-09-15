import * as React from "react";

import exportFromJSON from "export-from-json";
import { NavDropdown } from "react-bootstrap";
import { getBreakdownByTF, getAggregateSummaryData } from "./summary-table.js";
// The export button located on page header
// TODOs:
// 1. Implement save/load function
export function ExportButton({ activeTab, dataTable, summaryTables }) {
  // Use export-from-json package, create a download of csv file
  const ExportCSV = (e) => {
    const accessor = activeTab;

    const exportType = "csv";
    const states = dataTable.cols.filter((item) => item.type === "state");

    // create an attribute mapping for displayname correction
    const attributeMapping = {};
    states.forEach((state) => {
      attributeMapping[state["accessor"]] = state["displayName"];
    });

    // separate base table case with summary talbes of user defined states
    if (accessor === "BASE_TABLE") {
      const fileName = "BASE_TABLE";
      const data = dataTable.rows.map((item) => {
        const newItem = { ...item };
        for (const [origin, expected] of Object.entries(attributeMapping)) {
          newItem[expected] = item[origin];
          delete newItem[origin];
        }

        return newItem;
      });
      // export base table
      exportFromJSON({ data, fileName, exportType });
    } else {
      // summary table variables
      const summaryTable = summaryTables.filter(
        (item) => item.state.id === accessor
      )[0].state;
      const [cols, Rows] = getBreakdownByTF(dataTable, summaryTable);

      const fileName = "Summary_Table_" + summaryTable.name;

      // this applies "show true only" now, modify the filter to show all.
      const rows = Rows.filter((r) => r["STATE_VALUE"] === true);

      const data = rows.map((r) => {
        let row = {};
        for (let idx = 0; idx < cols.length; idx++) {
          row[cols[idx].Header] = r[cols[idx].accessor];
        }
        return row;
      });

      // export summary table
      exportFromJSON({ data, fileName, exportType });
    }

    // Export the total table
    // This if-statement and code repeatation is added to solve a strange issue of the exportFromJson library
    if (accessor !== "BASE_TABLE") {
      const summaryTable = summaryTables.filter(
        (item) => item.state.id === accessor
      )[0].state;
      const [cols, Rows] = getBreakdownByTF(dataTable, summaryTable);

      const fileName = "Summary_Table_" + summaryTable.name + "_Total";
      const total = [getAggregateSummaryData([cols, Rows])];

      // create an attribute mapping for correction
      const attributeMapping = {
        VISITS: "Visits",
        TOTAL_DURATION: "Time in State",
        AVG_DURATION: "Average time in State",
        TOTAL_DISTANCE: "Time Outside State",
        TOTAL_OUTSIDE_DURATION: "Total Distance",
      };
      const data = total.map((item) => {
        const newItem = { ...item };
        for (const [origin, expected] of Object.entries(attributeMapping)) {
          newItem[expected] = item[origin];
          delete newItem[origin];
        }
        return newItem;
      });

      // export total info
      exportFromJSON({ data, fileName, exportType });
    }

    e.preventDefault();
  };

  return (
    <NavDropdown title="Export Data">
      <NavDropdown.Item onClick={ExportCSV}>To Local Drive</NavDropdown.Item>
      {/* <NavDropdown.Item>To Google Drive</NavDropdown.Item> */}
    </NavDropdown>
  );
}
