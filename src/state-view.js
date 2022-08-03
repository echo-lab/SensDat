import React, { useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';

import { UIState } from "./ui-state.js";
import { actions } from "./app-state.js";
import { getDependentStates } from "./utils.js";


export function StateView({ uiState, dispatch, userDefinedStates, tmpUserDefinedState, createRegionInteraction }) {
  let handleCreateRegion = () => dispatch(actions.startCreateRegion({dispatch}));
  let handleCreateTimespan = () => {};
  let handleCreateCompoundState = () => dispatch(actions.startCreateCompoundState());
  // maybeDeleteState contains the state which is being deleted (the user has to confirm).
  let [maybeDeleteState, setMaybeDeleteState] = useState(null);

  let onStateDelete = () => {
    dispatch(actions.deleteState(maybeDeleteState));
    setMaybeDeleteState(null);
  };

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
          <Dropdown.Item
            onClick={handleCreateCompoundState}
            disabled={userDefinedStates.length < 2}
            >
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
              onMouseEnter={()=>dispatch(actions.highlightPointsForState(s))}
              onMouseLeave={()=>dispatch(actions.highlightPoints([]))}
              className="mx-2"
              disabled={uiState.statePaneDisabled()}
            >
              <Dropdown.Item
                onClick={()=>dispatch(actions.createSummary(s.id))}>
                Create Summary
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => setMaybeDeleteState(s)}>
                Delete
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
    {
      maybeDeleteState ? (
        <DeleteStateModal
          state={maybeDeleteState}
          states={userDefinedStates}
          onConfirm={onStateDelete}
          onCancel={()=>setMaybeDeleteState(null)}
        />
      ) : null
    }
    </>
  );
}

function DeleteStateModal({state, states, onConfirm, onCancel}) {

  let deps = getDependentStates(state, states);

  return (
    <Modal show={true} onHide={onCancel}>
      <Modal.Header closeButton>
        <Modal.Title>Confirm delete state</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Are you sure you want to delete state: <br/>
          <strong>
            {state.name}?
          </strong>
        </p>
        {
          deps.length > 0 ? (
            <>
              <p className="mt-3 text-danger">
                WARNING: the following states are dependent on {state.name} and will
                also be deleted:
              </p>
              <ul className="text-danger">
                {deps.map(dep => (
                  <li key={dep.id}>
                    <strong>{dep.name}</strong>
                  </li>
                ))}
              </ul>
            </>
          ) : null
        }
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="outline-danger"
          onClick={onConfirm}
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
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
