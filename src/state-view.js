import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { UIState } from "./ui-state.js";
import { actions } from "./app-state.js";

export function StateView({ uiState, dispatch, createStateValid }) {
  // This pane is only present for UIState.CreateRegion
  let regionPane = uiState === UIState.CreateRegion && (
    <CreateRegionPane dispatch={dispatch} createStateValid={createStateValid} />
  );

  return (
    <div className="state-container debug">
      <NewStateContainer dispatch={dispatch} />
      <div className="existing-state-container debug"></div>
      {regionPane}
    </div>
  );
}

function NewStateContainer({ dispatch }) {
  let handleCreateRegion = () => dispatch(actions.startCreateRegion());

  return (
    <div className="new-state-container debug">
      <h4 className="py-4 text-center"> Create New State </h4>
      <div className="d-grid gap-2 py-4">
        <CreateStateButton
          stateType="Region"
          handleClick={handleCreateRegion}
        />
        <CreateStateButton stateType="Timespan" />
        <CreateStateButton stateType="Compound State" />
      </div>
    </div>
  );
}

function CreateStateButton({ stateType, handleClick }) {
  return (
    <Button variant="outline-dark" size="md" onClick={handleClick}>
      {stateType}
    </Button>
  );
}

function CreateRegionPane({ dispatch, createStateValid }) {
  let [regionName, setRegionName] = useState("");

  let handleChange = (e) => setRegionName(e.target.value);
  let handleSubmit = () => console.log("Region Name:", regionName);
  let handleCancel = () => dispatch(actions.cancelCreateRegion());

  return (
    <div className="create-state-container def-visible debug">
      <div className="text-center py-4 px-5">
        <Form>
          <Form.Group className="mb-3" controlId="formNewRegionName">
            <Form.Label>Region Name: </Form.Label>
            <Form.Control
              type="text"
              placeholder="My Region"
              value={regionName}
              onChange={handleChange}
            />
          </Form.Group>
          <Button
            variant="outline-dark"
            size="md"
            onClick={handleSubmit}
            disabled={!createStateValid || !regionName}
          >
            Done
          </Button>{" "}
          <Button variant="outline-dark" size="md" onClick={handleCancel}>
            Cancel
          </Button>
        </Form>
      </div>
    </div>
  );
}
