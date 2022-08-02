import React, { useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import { UIState } from "./ui-state.js";
import { actions } from "./app-state.js";


export function StateView({ uiState, dispatch, userDefinedStates, tmpUserDefinedState, createRegionInteraction }) {
  let handleCreateRegion = () => dispatch(actions.startCreateRegion({dispatch}));
  let handleCreateTimespan = () => {};
  let handleCreateCompoundState = () => dispatch(actions.startCreateCompoundState());

  return (
    <>
    <Row>
      <Col className="state-container" xs={8}>
        <DropdownButton
          variant="outline-primary" size="sm" id="dropdown-basic-button"
          title="+ New State" className="mx-2"
          disabled={uiState.statePaneDisabled()}
        >
          <Dropdown.Item onClick={handleCreateRegion}>
            Region
          </Dropdown.Item>
          <Dropdown.Item onClick={handleCreateTimespan}>
            Timespan
          </Dropdown.Item>
          <Dropdown.Item onClick={handleCreateCompoundState}>
            Compound
          </Dropdown.Item>
        </DropdownButton>
        { userDefinedStates.map(s=> (
            <DropdownButton
              variant="outline-dark"
              size="sm"
              id="dropdown-basic-button"
              key={s.id}
              title={s.name}
              className="mx-2"
              disabled={uiState.statePaneDisabled()}
            >
              <Dropdown.Item
                onClick={()=>dispatch(actions.createSummary(s.id))}>
                Create Summary
              </Dropdown.Item>
            </DropdownButton>
          ))
        }
      </Col>
    </Row>
    <CreateRegionPane
      uiState={uiState}
      dispatch={dispatch}
      tmpUserDefinedState={tmpUserDefinedState}
      createRegionInteraction={createRegionInteraction}
      />
    </>
  );
}

// Returns null if it shouldn't be shown.
function CreateRegionPane({ uiState, dispatch, tmpUserDefinedState, createRegionInteraction }) {
  let [regionName, setRegionName] = useState("");

  if (uiState !== UIState.CreateRegion) return null;

  let handleChange = (e) => {
    setRegionName(e.target.value);
    createRegionInteraction.setName(e.target.value);
  };
  let handleSubmit = () => {
    dispatch(actions.commitTempState());
    setRegionName("");
  };
  let handleCancel = () => {
    dispatch(actions.cancelCreateRegion());
    setRegionName("");
  };

  return (
    <Row className="pb-2">
    <Col></Col>
    <Col xs={5} className="p-1">
      <Form className="form-horizontal">
      <Form.Group as={Row}>
        <Col>
          <Form.Control
            type="text"
            placeholder="Region Name"
            value={regionName}
            onChange={handleChange}
            className="mt-1"
          />
        </Col>
        <Col>
          <Button
            variant="outline-dark"
            size="md"
            className="m-1"
            onClick={handleSubmit}
            disabled={!tmpUserDefinedState || tmpUserDefinedState.name === ""}
          >
            Done
          </Button>
          <Button
            variant="outline-dark"
            className="m-1"
            size="md" onClick={handleCancel}>
            Cancel
          </Button>
        </Col>
      </Form.Group>
      </Form>
    </Col>
    <Col></Col>
    </Row>
  );
}
