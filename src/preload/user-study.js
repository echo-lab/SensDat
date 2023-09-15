import * as React from "react";
import NavDropdown from "react-bootstrap/NavDropdown";

import { DataTable } from "../data-table";
import { actions } from "../app-state";
import { SiteLayout } from "../upload-layout";

const TASK1_LAYOUT_PATH = `${process.env.PUBLIC_URL}/task1-layout.png`;

export function UserStudyLoader({ dispatch }) {
  let loadTask2 = (e) => {
    e.preventDefault();
    DataTable.Task2Data().then((dt) => {
      dispatch(actions.loadTable(dt));
    });
  };

  let loadTask1 = async (e) => {
    e.preventDefault();
    let table = await DataTable.Task1Data();

    let layout_file = await fetch(TASK1_LAYOUT_PATH);
    let f = await layout_file.blob();
    let siteLayout = await SiteLayout.FromFile(f);

    dispatch(actions.loadTable(table));
    dispatch(actions.finishUploadLayout(siteLayout));
  };

  return (
    <NavDropdown className="no-arrow" title="User Study">
      <NavDropdown.Item onClick={loadTask1}>Task 1</NavDropdown.Item>
      <NavDropdown.Item onClick={loadTask2}>Task 2</NavDropdown.Item>
    </NavDropdown>
  );
}
