import NavDropdown from "react-bootstrap/NavDropdown";

import { DataTable } from "../data-table";
import { actions } from "../app-state";
import { SiteLayout } from "../upload-layout";

const MAP1 = `${process.env.PUBLIC_URL}/class-layout-v1.png`;
const MAP2 = `${process.env.PUBLIC_URL}/class-layout-v2.png`;

const DATA1 = `${process.env.PUBLIC_URL}/class_simulated_data.csv`;

export function ClassExerciseLoader({ dispatch }) {
  let loadExercise1 = async (e) => {
    e.preventDefault();
    let table = await DataTable.FromHostedData(DATA1);

    let layout_file = await fetch(MAP2);
    let f = await layout_file.blob();
    let siteLayout = await SiteLayout.FromFile(f);

    // Finagling lol
    siteLayout = siteLayout.withScale(0.9);

    // NOTE: just have to use these to make the data
    // match the map lol.
    let scale = 1;  // i.e., 3x bigger than the demo data lol
    let targetParams = {
        angle: 0,
        center: [422, 250],
        width: 645 / scale,
        height: -400 / scale,
    };

    dispatch(actions.loadTable(table, targetParams));
    dispatch(actions.finishUploadLayout(siteLayout));
    dispatch(actions.setTargetTransform(targetParams));  // lol
  };


  return (
    <>
      <NavDropdown.Item onClick={loadExercise1}>Exercise 1</NavDropdown.Item>
      {/* <NavDropdown.Item onClick={loadExercise2}>Exercise 2</NavDropdown.Item> */}
    </>
  );
}
