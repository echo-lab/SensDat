import React, { useEffect, useCallback } from "react";
import Button from 'react-bootstrap/Button';

export function StateView() {
  // TODO: need to pass in 1) the current states and 2) callback functions
  // for CreateStateButtons.
  return (
    <>
      <NewStateContainer />
      <div className="existing-state-container debug"></div>
    </>
  );
}

function NewStateContainer() {
  return (
    <div className="new-state-container debug">
      <h4 className="py-4 text-center"> Create New State </h4>
      <div className="d-grid gap-2 py-4">
        <CreateStateButton stateType="Region" />
        <CreateStateButton stateType="Timespan" />
        <CreateStateButton stateType="Compound State" />
      </div>
    </div>
  );
}

function CreateStateButton({stateType}) {
  return (
    <Button variant="outline-dark" size="md">
      {stateType}
    </Button>
  );
}
