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

  return (
    <>
    <Row>
      <Col className="state-container">
        { userDefinedStates.map(s=> (
            <Button variant="outline-primary" size="sm" className="mx-2">
              {s.name}
            </Button>
          ))
        }
        <DropdownButton
          variant="outline-primary" size="sm" id="dropdown-basic-button"
          title="+ New State" className="mx-2"
        >
          <Dropdown.Item onClick={handleCreateRegion}>
            Region
          </Dropdown.Item>
          <Dropdown.Item href="#/action-2">Timespan</Dropdown.Item>
          <Dropdown.Item href="#/action-3">Compound</Dropdown.Item>
        </DropdownButton>
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
  let handleSubmit = () => dispatch(actions.commitTempState());
  let handleCancel = () => dispatch(actions.cancelCreateRegion());

  return (
    <Row className="mt-3">
    <Col></Col>
    <Col xs={4} className="debug p-3"><Row>
      <Col>
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
        </Form>
      </Col>
      <Col>
      <Form>
          <Button
            variant="outline-dark"
            size="md"
            className="m-1"
            onClick={handleSubmit}
            disabled={!tmpUserDefinedState || tmpUserDefinedState.name === ""}
          >
            Done
          </Button>{" "}
          <br />
          <Button
            variant="outline-dark"
            className="m-1"
            size="md" onClick={handleCancel}>
            Cancel
          </Button>
        </Form>
        </Col>
      </Row></Col>
    <Col></Col>
    </Row>
  );
}
