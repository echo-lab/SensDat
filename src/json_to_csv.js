import exportFromJSON from "export-from-json";
import { NavDropdown } from "react-bootstrap";
import { getBreakdownByTF } from "./summary-table.js"

// The export button located on page header
// TODOs: 
// 1. Implement export to Google Drive function
//
export function ExportButton(props) {
    
    // Use export-from-json package, create a download of csv file
    const ExportCSV = (e) => {
        const accessor = props.data.activeTab;
        
        const exportType = "csv";
        const states = props.data.dataTable.cols.filter(item => item.type === "state")
        
        // create an attribute mapping for displayname correction
        const attributeMapping = {};
        states.forEach(state => {
            attributeMapping[state["accessor"]] = state["displayName"];
        });

        // summary table variables
        const summaryTable = accessor === "BASE_TABLE" ? {} : props.data.summaryTables.filter(item => item.state.id === accessor)[0].state;
        const [cols, Rows] = accessor === "BASE_TABLE" ? [0,0] : 
        getBreakdownByTF(props.data.dataTable, summaryTable);
        
        // determine file name
        const fileName = accessor === "BASE_TABLE" ? accessor : "Summary_Table_" + summaryTable.name;

        // TODO? generate a show true&false segment table
        const rows = accessor === "BASE_TABLE" ? null : Rows.filter(r => r["STATE_VALUE"] === true);

        const data = accessor === "BASE_TABLE" ? props.data.dataTable.rows.map(
            item => {
                const newItem = {...item};
                for (const [origin, expected] of Object.entries(attributeMapping)){
                    newItem[expected] = item[origin];
                    delete newItem[origin];
                }
                
                return newItem
            }
        ) : rows.map(r => {
            let row = {};
            for (let idx = 0; idx < cols.length ; idx++){
                row[cols[idx].Header] = r[cols[idx].accessor];
            }
            return row;
        });

        exportFromJSON({ data, fileName, exportType });

        e.preventDefault();
    };

    return(
        <NavDropdown title="Export Data">
            <NavDropdown.Item onClick={ExportCSV}>To Local Drive</NavDropdown.Item>
            <NavDropdown.Item>To Google Drive</NavDropdown.Item>
        </NavDropdown>
    )
      
}