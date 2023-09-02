import React, { useState } from "react";

import {
  Button,
  Form,
  Dropdown,
  DropdownButton,
  Row,
  Col,
  Modal,
} from "react-bootstrap";

import { UIState } from "./ui-state.js";
import { actions } from "./app-state.js";
import { getDependentStates } from "./utils.js";

export function StateView({
  uiState,
  dispatch,
  userDefinedStates,
  tmpUserDefinedState,
  createRegionInteraction,
}) {
  let handleCreateRegion = () =>
    dispatch(actions.startCreateRegion({ dispatch }));
  let handleCreateTimespan = () => {};
  let handleCreateCompoundState = () =>
    dispatch(actions.startCreateCompoundState());
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
            variant="outline-primary"
            size="sm"
            id="dropdown-basic-button"
            title="+ New State"
            className="mx-2"
            disabled={uiState.busy()}
          >
            <Dropdown.Item onClick={handleCreateRegion}>Region</Dropdown.Item>
            <Dropdown.Item onClick={handleCreateTimespan}>
              Timespan
            </Dropdown.Item>
            <Dropdown.Item
              onClick={handleCreateCompoundState}
              disabled={userDefinedStates.length < 2}
            >
              Combination
            </Dropdown.Item>
          </DropdownButton>
          <DropdownButton
            variant="outline-primary"
            size="sm"
            id="dropdown-basic-button"
            title="+ New Time Graph"
            className="mx-2"
            disabled={uiState.busy()}
          >
            <Dropdown.Item
              onClick={() => dispatch(actions.createTimeGraph("Longitude"))}
            >
              Longitude
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => dispatch(actions.createTimeGraph("Latitude"))}
            >
              Latitude
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => dispatch(actions.createTimeGraph("Elevation"))}
            >
              Elevation
            </Dropdown.Item>
          </DropdownButton>
          {userDefinedStates.map((s) => (
            <DropdownButton
              variant="outline-dark"
              size="sm"
              id="dropdown-basic-button"
              key={s.id}
              title={s.name}
              onMouseEnter={() => dispatch(actions.highlightPointsForState(s))}
              onMouseLeave={() => dispatch(actions.highlightPoints([]))}
              className="mx-2"
              disabled={uiState.busy()}
            >
              <Dropdown.Item
                onClick={() => dispatch(actions.createSummary(s.id))}
              >
                Create Summary
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setMaybeDeleteState(s)}>
                Delete
              </Dropdown.Item>
            </DropdownButton>
          ))}
        </Col>
      </Row>
      <CreateRegionPane
        uiState={uiState}
        dispatch={dispatch}
        tmpUserDefinedState={tmpUserDefinedState}
        createRegionInteraction={createRegionInteraction}
      />
      {maybeDeleteState ? (
        <DeleteStateModal
          state={maybeDeleteState}
          states={userDefinedStates}
          onConfirm={onStateDelete}
          onCancel={() => setMaybeDeleteState(null)}
        />
      ) : null}
    </>
  );
}

function DeleteStateModal({ state, states, onConfirm, onCancel }) {
  let deps = getDependentStates(state, states);

  return (
    <Modal show={true} onHide={onCancel}>
      <Modal.Header closeButton>
        <Modal.Title>Confirm delete state</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Are you sure you want to delete state: <br />
          <strong>{state.name}?</strong>
        </p>
        {deps.length > 0 ? (
          <>
            <p className="mt-3 text-danger">
              WARNING: the following states are dependent on {state.name} and
              will also be deleted:
            </p>
            <ul className="text-danger">
              {deps.map((dep) => (
                <li key={dep.id}>
                  <strong>{dep.name}</strong>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="outline-danger" onClick={onConfirm}>
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// Returns null if it shouldn't be shown.
function CreateRegionPane({
  uiState,
  dispatch,
  tmpUserDefinedState,
  createRegionInteraction,
}) {
  // let [regionName, setRegionName] = useState("");
  let [modalActive, setModalActive] = useState(false);

  if (uiState !== UIState.CreateRegion) return null;

  let handleCancel = () => {
    dispatch(actions.cancelCreateRegion());
    setModalActive(false);
  };

  let nameStateProps = {
    onClose: () => setModalActive(false),
    onSubmit: () => {
      dispatch(actions.commitTempState());
      setModalActive(false);
    },
    setNameInTable: (name) => {
      createRegionInteraction.setName(name);
    },
  };

  return (
    <Row className="pb-2">
      <hr />
      <Col xs={1}></Col>
      <Col xs={8} className="p-1">
        <Form className="form-horizontal">
          <Form.Group as={Row}>
            <Col>
              <h5 className="mt-2">Edit the new region on the map</h5>
            </Col>
            <Col>
              <Button
                variant="outline-dark"
                className="m-1"
                size="md"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                className="m-1"
                onClick={() => setModalActive(true)}
                disabled={!tmpUserDefinedState}
              >
                Next
              </Button>
            </Col>
          </Form.Group>
        </Form>
      </Col>
      <Col></Col>
      {modalActive ? <StateNameModal {...nameStateProps} /> : null}
    </Row>
  );
}

function StateNameModal({ onClose, onSubmit, setNameInTable }) {
  let [name, setName] = useState("");

  let onChange = (e) => {
    let name = e.target.value;
    if (name.length > 20) return;
    setName(name);
    setNameInTable(name);
  };

  let onCancel = () => {
    setNameInTable("");
    onClose();
  };

  return (
    <Modal show={true} onHide={onCancel} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Name your new region</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={(e) => e.preventDefault()} className="form-horizontal">
          <Form.Control
            as="input"
            type="text"
            placeholder="Region Name"
            autoFocus
            htmlSize="10"
            value={name}
            onChange={onChange}
          />
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Back
        </Button>
        <Button variant="primary" onClick={onSubmit} disabled={name === ""}>
          Create Region
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
