import exportFromJSON from "export-from-json";
import { NavDropdown } from "react-bootstrap";
import { getBreakdownByTF, getAggregateSummaryData } from "./summary-table.js"
import * as AppState from "./app-state.js";
import {useRef} from 'react'
import * as LZString from "lz-string";
import { DataTable } from "./data-table.js";
import { EditBox } from "./edit-box.js";
import { SiteLayout } from "./upload-layout.js";
import { objectToState } from "./utils.js"
// The export button located on page header
// TODOs: 
// 1. Implement save/load function
export function ExportButton({activeTab, dataTable, summaryTables, state, dispatch}) {
    
    // Use export-from-json package, create a download of csv file
    const ExportCSV = (e) => {
        
        const accessor = activeTab;
        
        const exportType = "csv";
        const states = dataTable.cols.filter(item => item.type === "state")
        
        // create an attribute mapping for displayname correction
        const attributeMapping = {};
        states.forEach(state => {
            attributeMapping[state["accessor"]] = state["displayName"];
        });

        // separate base table case with summary talbes of user defined states
        if (accessor === "BASE_TABLE"){
            const fileName = "BASE_TABLE";
            const data = dataTable.rows.map(
                item => {
                    const newItem = {...item};
                    for (const [origin, expected] of Object.entries(attributeMapping)){
                        newItem[expected] = item[origin];
                        delete newItem[origin];
                    }
                    
                    return newItem;
                }
            )
            // export base table
            exportFromJSON({ data, fileName, exportType });
        }
        else {
            // summary table variables
            const summaryTable = summaryTables.filter(item => item.state.id === accessor)[0].state;
            const [cols, Rows] = getBreakdownByTF(dataTable, summaryTable);
            
            const fileName = "Summary_Table_" + summaryTable.name;
            
            // this applies "show true only" now, modify the filter to show all.
            const rows = Rows.filter(r => r["STATE_VALUE"] === true);

            const data = rows.map(r => {
                let row = {};
                for (let idx = 0; idx < cols.length ; idx++){
                    row[cols[idx].Header] = r[cols[idx].accessor];
                }
                return row;
            });

            // export summary table
            exportFromJSON({ data, fileName, exportType });
        }

        // Export the total table
        // This if-statement and code repeatation is added to solve a strange issue of the exportFromJson library
        if (accessor !== "BASE_TABLE"){
            const summaryTable = summaryTables.filter(item => item.state.id === accessor)[0].state;
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
            const data = total.map(item =>{
                const newItem = {...item};
                for (const [origin, expected] of Object.entries(attributeMapping)){
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
    
    // switch: save project as compressed string or json
    const compress = false;

    // Save project to local
    const SaveProject = (e) => {
        const data = compress? AppState.serialize(state): JSON.parse(LZString.decompress(AppState.serialize(state)));
        const fileName = "Sensdat_Project";
        const exportType = compress? "text":"json";
        exportFromJSON({data, fileName, exportType});
        e.preventDefault();
    }

    // Load project from local
    const lp = useRef(null);
    const  LoadProject = (e) => {
        e.preventDefault();
        if (compress){
            fetch(e.target.files[0]).then((r) => {return r;}).then(serializedState => {
                AppState.deserialize(serializedState).then((deserializedState) =>
                dispatch(AppState.actions.loadState(deserializedState)));
            });
        }
        
        else{
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = JSON.parse(e.target.result);
                console.log(data);
                dispatch(AppState.actions.loadState({
                    dataTable: DataTable.fromObject(data.dataTable),
                    userDefinedStates: data.userDefinedStates.map((o) => objectToState(o)),
                    summaryTables: data.summaryTables.map((s) => ({ state: objectToState(s) })),
                    defaultDataTransform:
                    data.defaultDataTransform &&
                    EditBox.fromObject(data.defaultDataTransform),
                    currentDataTransform:
                    data.currentDataTransform &&
                    EditBox.fromObject(data.currentDataTransform),
                    siteLayout:
                    data.siteLayout && (await SiteLayout.Deserialize(data.siteLayout)),
                }));
            }
            reader.readAsText(file);
        }

    }

    return(
        <NavDropdown title="Export Data">
            <NavDropdown.Item onClick={ExportCSV}>To Local Drive</NavDropdown.Item>
            <NavDropdown.Divider></NavDropdown.Divider>
            <NavDropdown.Item onClick={SaveProject}>Save Project</NavDropdown.Item>
            <NavDropdown.Item onClick={() => lp.current.click()}>Load Project</NavDropdown.Item>
            <input type='file' ref={lp} onChange={LoadProject} style={{display: 'none'}}/>
        </NavDropdown>
    )
      
}
