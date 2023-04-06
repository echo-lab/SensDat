import NavDropdown from "react-bootstrap/NavDropdown";

import { DataTable } from "../data-table";
import { actions } from "../app-state";
import { SiteLayout } from "../upload-layout";

const MAP1 = `${process.env.PUBLIC_URL}/class-layout-v1.png`;
const MAP2 = `${process.env.PUBLIC_URL}/class-layout-v2.png`;

export function ClassExerciseLoader({ dispatch }) {
  let loadExercise1 = async (e) => {
    e.preventDefault();
    let table = await DataTable.Task1Data();

    let layout_file = await fetch(MAP2);
    let f = await layout_file.blob();
    let siteLayout = await SiteLayout.FromFile(f);

    // Finagling lol
    siteLayout = siteLayout.withScale(0.9);

    let scale = 2.5  // i.e., 2.5x bigger than the demo data lol
    let targetParams = {
        angle: 0,
        center: [400, 250],
        width: 615 / scale,
        height: -385 / scale,
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
