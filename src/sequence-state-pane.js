import React, { useState, useMemo } from "react";

import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import { actions } from "./app-state.js";
import { CloseButton, Table, ToggleButton } from "react-bootstrap";
import {
  SequenceSummaryTable,
  calcAggregateFunctions,
  groupByStates,
} from "./summary-table.js";
import { TableStyles, hhmmss } from "./utils.js";
import { SequenceState } from "./states/sequence-state.js";

const TIME_COLS = ["START_TIME", "END_TIME"];

const CHOOSE_SEQUENCE = 1;
const VERIFY_AND_NAME = 2;

export function SequenceStatePane({ userDefinedStates, dispatch, dataTable }) {
  let [chosenStates, setChosenStates] = useState([...userDefinedStates]);
  let [step, setStep] = useState(CHOOSE_SEQUENCE);
  let [selectedRange, setSelectedRangeRaw] = useState([-1, -1]);
  let [name, setNameRaw] = useState("");

  let byStates = useMemo(() => {
    let gRows = groupByStates(dataTable, chosenStates);
    let [aggCols, aggRows] = calcAggregateFunctions(
      dataTable,
      gRows.map((r) => r.range)
    );

    let idToName = Object.fromEntries(
      chosenStates.map(({ id, name }) => [id, name])
    );
    let stateString = (L) =>
      L.length === 0 ? "[None]" : L.map((id) => idToName[id]).join(", ");

    let cols = [{ Header: "State(s)", accessor: "prettyStates" }, ...aggCols];
    let rows = gRows.map(({ states, range }, idx) => ({
      states,
      range,
      prettyStates: stateString(states),
      ...aggRows[idx],
    }));

    return [cols, rows];
  }, [dataTable, chosenStates]);

  let takenNames = userDefinedStates.map((s) => s.name);

  let seqState = useMemo(
    () =>
      new SequenceState(
        chosenStates.map((s) => s.id),
        byStates[1]
          .slice(selectedRange[0], selectedRange[1] + 1)
          .map((row) => row.states),
        ""
      ),
    [chosenStates, byStates, selectedRange]
  );

  let highlightFn = (points) => dispatch(actions.highlightPoints(points));

  // Sets the selected indices of the table. This essentially defines the sequence.
  let setSelectedRange = (range) => {
    setSelectedRangeRaw(range);

    // If something's changed, update the highlight!
    if (range === selectedRange) return;
    let [lo, hi] = range;
    highlightFn(byStates[1].slice(lo, hi + 1).map((s) => s.range));
  };

  let toggleChosenState = (s) => {
    if (chosenStates.includes(s)) {
      setChosenStates(chosenStates.filter((cs) => cs !== s));
    } else {
      setChosenStates([...chosenStates, s]);
    }
    setSelectedRange([-1, -1]);
  };

  let setName = (name) => {
    name.length < 20 && setNameRaw(name);
  };

  let onSubmit = () => {
    if (name.length === 0) return;
    let s = seqState.withName(name);
    dispatch(actions.createSequenceState(s));
  };

  let chooseSequenceProps = {
    userDefinedStates,
    sequence: seqState.sequence,
    chosenStates,
    toggleChosenState,
    byStates,
    selectedRange,
    setSelectedRange,
    advanceStep: () => setStep(VERIFY_AND_NAME),
  };

  let idToName = Object.fromEntries(
    chosenStates.map(({ name, id }) => [id, name])
  );

  let verifySequenceProps = {
    highlightFn,
    seqState,
    name,
    idToName,
    setName,
    onSubmit,
    dataTable,
    takenNames,
  };

  return (
    <Container>
      <Row>
        <Col sm={2}>
          {step === VERIFY_AND_NAME && (
            <Button variant="link" onClick={() => setStep(CHOOSE_SEQUENCE)}>
              &lt; Back
            </Button>
          )}
        </Col>
        <Col sm={8}>
          <h2 className="text-center"> Create Sequence State </h2>
        </Col>
        <Col sm={2}>
          <CloseButton
            aria-label="cancel"
            className="float-end"
            onClick={() => dispatch(actions.cancelCreateSequence())}
          />{" "}
        </Col>
      </Row>
      <hr />
      {step === CHOOSE_SEQUENCE ? (
        <ChooseSequenceStep {...chooseSequenceProps} />
      ) : (
        <VerifySequenceStep {...verifySequenceProps} />
      )}
    </Container>
  );
}

function ChooseSequenceStep({
  userDefinedStates,
  chosenStates,
  sequence,
  toggleChosenState,
  byStates,
  selectedRange,
  setSelectedRange,
  advanceStep,
}) {
  let seqTableProps = {
    chosenStates,
    byStates,
    selectedRange,
    setSelectedRange,
  };
  return (
    <Container>
      <Row className="text-center">
        <Col />
        <Col>
          <h5>Included States:</h5>
        </Col>
        <Col />
      </Row>
      <Row>
        <form className="text-center">
          {userDefinedStates.map((state) => (
            <ToggleButton
              key={state.id}
              size="sm"
              className="m-2 toggle-butt"
              type="checkbox"
              checked={chosenStates.includes(state)}
              variant={
                chosenStates.includes(state) ? "success" : "outline-secondary"
              }
              onClick={(e) => toggleChosenState(state)}
            >
              {state.name}
            </ToggleButton>
          ))}
        </form>
      </Row>
      <Row className="text-center mt-3 mb-3">
        <hr />
        <Col />
        <Col sm={7}>
          <h5 className="mt-3">Drag your mouse to select a sequence</h5>
        </Col>
        <Col sm={1}>
          <Button
            className="mt-3 mx-3"
            variant="primary"
            size="sm"
            onClick={advanceStep}
            disabled={sequence.length === 0 || chosenStates.length === 0}
          >
            Next
          </Button>
        </Col>
        <Col />
      </Row>
      <Row
        className="text-center"
      >
        <TableStyles>
          <SequenceTable {...seqTableProps} />
        </TableStyles>
      </Row>
    </Container>
  );
}

// For selecting a sequence
function SequenceTable({ byStates, selectedRange, setSelectedRange }) {
  let [dragging, setDragging] = useState(false);
  let [startIdx, setStartIdx] = useState(-1);

  let [cols, rows] = byStates;
  let [lo, hi] = selectedRange;

  let onMouseDown = (idx) => {
    setDragging(true);
    setStartIdx(idx);
    setSelectedRange([idx, idx]);
  };

  let onMouseEnter = (idx) => {
    if (!dragging) return;
    idx <= startIdx
      ? setSelectedRange([idx, startIdx])
      : setSelectedRange([startIdx, idx]);
  };

  let onMouseUp = () => setDragging(false);

  return (
    <Table
      onMouseUp={onMouseUp}
      className="prevent-select"
      style={{ cursor: "pointer", borderWidth: 2 }}
    >
      <thead>
        <tr role="row">
          {cols.map((col, idx) => (
            <th key={idx} role="columnheader">
              {col.Header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr
            role="row"
            key={idx}
            className={lo <= idx && idx <= hi ? "selected-row" : ""}
            onMouseDown={() => onMouseDown(idx)}
            onMouseEnter={() => onMouseEnter(idx)}
          >
            {cols.map(({ Header, accessor }, idx) => {
              if (row[accessor] === undefined) return null;
              let className = "";
              if (Header === "State(s)") {
                className = row[accessor] === "[None]" ? "faded" : "bolded";
              }
              return (
                <td role="cell" key={idx} className={className}>
                  {TIME_COLS.includes(accessor)
                    ? hhmmss(row[accessor])
                    : row[accessor]}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function VerifySequenceStep({
  highlightFn,
  seqState,
  name,
  idToName,
  setName,
  onSubmit,
  dataTable,
  takenNames,
}) {
  let tableProps = {
    trueOnly: false,
    showBreakdown: true,
    table: dataTable,
    seqState,
    idToName,
    highlightFn,
    allowDropdown: false,
    nameOverride: name,
  };

  return (
    <Container className="p-3">
      <Row className="mb-3 text-center">
        <h5> Verify Your Sequence Looks Correct and Give it a Name</h5>
      </Row>
      <Row>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Form.Group as={Row} className="mb-3" controlId="stateName">
            <Col />
            <Form.Label column sm={1}>
              Name:{" "}
            </Form.Label>
            <Col sm={4}>
              <Form.Control
                required
                type="text"
                size="sm"
                className="mt-1 mx-2"
                placeholder="sequence name"
                isInvalid={takenNames.includes(name)}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
              <Form.Control.Feedback type="invalid">
                State already exists
              </Form.Control.Feedback>
            </Col>
            <Col sm={2}>
              <Button
                disabled={takenNames.includes(name)}
                size="sm"
                className="mt-1"
                type="submit"
              >
                Create
              </Button>
            </Col>
            <Col />
          </Form.Group>
        </Form>
      </Row>
      <Row
        className="text-center"
      >
        <TableStyles>
          <SequenceSummaryTable {...tableProps} />
        </TableStyles>
      </Row>
    </Container>
  );
}
