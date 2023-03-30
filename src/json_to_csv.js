import exportFromJSON from "export-from-json";
import { NavDropdown } from "react-bootstrap";
import {
  getBreakdownByTF,
  getAggregateSummaryData,
  getBreakdownByAllStates,
} from "./summary-table.js";
import { getSequenceInfo } from "./utils.js";
// The export button located on page header
// TODOs:
// 1. Implement save/load function
export function ExportButton({
  activeTab,
  dataTable,
  summaryTables,
  stateSequence,
  userDefinedStates,
}) {
  // Use export-from-json package, create a download of csv file
  const ExportCSV = (e) => {
    const accessor = activeTab;

    if (activeTab === "ALL_SUMMARY") {
      exportTotalSummaryTable({ dataTable, userDefinedStates, stateSequence });
      return;
    }

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
      <NavDropdown.Item onClick={ExportCSV}>Download CSV</NavDropdown.Item>
      {/* <NavDropdown.Item>To Google Drive</NavDropdown.Item> */}
    </NavDropdown>
  );
}

function exportTotalSummaryTable({
  dataTable,
  userDefinedStates,
  stateSequence,
}) {
  if (userDefinedStates.length === 0) return;

  let [cols, rows] = getBreakdownByAllStates(dataTable, userDefinedStates);

  let seqNums;
  if (stateSequence) {
    seqNums = getSequenceInfo(
      rows.map((r) => r.STATE),
      stateSequence.seq
    );
  }

  let data = rows.map((row, idx) => {
    let res = {};
    if (stateSequence) {
      res[stateSequence.name] =
        seqNums[idx].seqNum >= 0 ? seqNums[idx].seqNum : "";
    }
    for (let { Header, accessor } of cols) {
      res[Header] = row[accessor];
    }
    return res;
  });

  exportFromJSON({
    data,
    fileName: "SUMMARY_TABLE",
    exportType: "csv",
  });
}
