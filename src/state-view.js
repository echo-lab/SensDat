import React, { useEffect, useCallback } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { UIState } from "./ui-state.js";

export function StateView({ uiState, handleCreateRegion, handleCancel }) {
  // TODO: need to pass in 1) the current states and 2) callback functions
  // for CreateStateButtons.
  let newStateContainerProps = { handleCreateRegion, handleCancel };
  let createRegionProps = { handleCancel };

  if (uiState === UIState.CreateRegion) {
    return <CreateRegionPane {...createRegionProps} />;
  }

  return (
    <>
      <NewStateContainer {...newStateContainerProps} />
      <div className="existing-state-container debug"></div>
    </>
  );
}

function NewStateContainer({ handleCreateRegion, handleCancel }) {
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

// TODO: can this just go over the other pane???
function CreateRegionPane({ handleCancel }) {
  return (
    <div className="create-state-container def-visible debug">
      <div className="text-center py-4 px-5">
        <Form>
          <Form.Group className="mb-3" controlId="dunnowhatthisis">
            <Form.Label>Region Name: </Form.Label>
            <Form.Control type="text" placeholder="My Region" />
          </Form.Group>
          <Button variant="outline-dark" size="md">
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
