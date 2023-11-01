import React, { useState } from "react";

import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Table from "react-bootstrap/Table";

import { DataTable, COL_TYPES } from "./data-table.js";
import { TableStyles } from "./utils.js";
import { actions } from "./app-state.js";

// Define different screens lol.
const STEPS = Object.freeze({
  UPLOAD_FILE: 1,
  CHOOSE_COLUMNS: 2,
});

export function UploadDataWidget({ onCancel, onDone, dispatch }) {
  let [step, setStep] = useState(STEPS.UPLOAD_FILE);
  let [table, setTable] = useState(null);

  let uploadProps = {
    setTable,
    onCancel,
    advanceFn: () => setStep(STEPS.CHOOSE_COLUMNS),
    loadTestData: () => {
      DataTable.FromTestData(1).then((dt) => {
        dispatch(actions.loadTable(dt));
        onDone();
      });
    },
  };

  let classifyColsProps = {
    table,
    backFn: () => setStep(step - 1),
    onSuccess: (table) => {
      dispatch(actions.loadTable(table));
      onDone();
    },
  };

  return (
    <Modal
      show={true}
      onHide={onCancel}
      size={step === STEPS.UPLOAD_FILE ? "lg" : "xl"}
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title>Import Data</Modal.Title>
      </Modal.Header>
      {step === STEPS.UPLOAD_FILE ? (
        <UploadFileStep {...uploadProps} />
      ) : (
        <ClassifyColumnsStep {...classifyColsProps} />
      )}
    </Modal>
  );
}

// This returns a Modal.Body with a form for uploading a file.
function UploadFileStep({ setTable, advanceFn, onCancel, loadTestData }) {
  let [file, setFile] = useState(null);
  let [error, setError] = useState("");

  let onChange = (e) => {
    let f = e.target.files[0];
    if (f.type !== "text/csv") {
      setError("File format must be CSV.");
      return;
    }
    setError("");
    setFile(f);
  };

  let onNext = () => {
    DataTable.FromFile(file, {
      onSuccess: (table) => {
        setTable(table);
        advanceFn();
      },
      onError: ({ type, code, message, row }) => {
        setError(`Failed to parse CSV: ${message}`);
      },
    });
  };

  return (
    <>
      <Modal.Body>
        <Form.Group controlId="formFile" className="mb-3">
          <Form.Label>Please upload a CSV file</Form.Label>
          <Form.Control
            type="file"
            onChange={onChange}
            isInvalid={error !== ""}
          />
          {error === "" ? null : (
            <Form.Control.Feedback type="invalid">
              {error}
            </Form.Control.Feedback>
          )}
        </Form.Group>
        <p>
          Or use already-existing test data:
          <button
            type="button"
            class="btn btn-link"
            onClick={(e) => {
              e.preventDefault();
              loadTestData();
            }}
          >
            Use Test Data
          </button>
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onNext}
          disabled={error !== "" || file === null}
        >
          Next
        </Button>
      </Modal.Footer>
    </>
  );
}

// Returns a Modal.Body with a form for classifying columns in the uploaded table, as well as previewing the table.
function ClassifyColumnsStep({ onSuccess, table, backFn }) {
  let [indexCol, setIndexCol] = useState(guessCol("index", table));
  let [xCol, setXCol] = useState(guessCol("x", table));
  let [yCol, setYCol] = useState(guessCol("y", table));
  let [tCol, setTCol] = useState(guessCol("t", table));
  let [distCol, setDistCol] = useState(guessCol("dist", table));

  // Props for each dropdown menu.
  let props = [
    {
      name: "Index",
      val: indexCol,
      setter: setIndexCol,
      table,
      type: COL_TYPES.INDEX,
    },
    { name: "Timestamp", val: tCol, setter: setTCol, table, type: COL_TYPES.T },
    {
      name: "Longitude/X-Coordinate",
      val: xCol,
      setter: setXCol,
      table,
      type: COL_TYPES.X,
    },
    {
      name: "Latitude/Y-Coordinate",
      val: yCol,
      setter: setYCol,
      table,
      type: COL_TYPES.Y,
    },
    {
      name: "Distance",
      val: distCol,
      setter: setDistCol,
      table,
      type: COL_TYPES.DIST,
      optional: true,
    },
  ];

  // Check that columns are unique and add an error otherwise.
  for (let p of props) {
    if (p.val && props.some((other) => p !== other && p.val === other.val)) {
      p["error"] = "Columns must be unique";
    } else {
      p["error"] = null;
    }
  }

  let weGood = props.every(
    (p) => (p.optional || p.val !== null) && p.error === null
  );

  let onDone = () => {
    let colTypes = props.reduce(
      (res, { val, type }) => ({ ...res, [val]: type }),
      {}
    );
    onSuccess(table.withColumnTypes(colTypes));
  };

  return (
    <>
      <Modal.Body>
        <Container>
          <Form>
            <Row className="mb-3">
              <Col lg="5">
                <ColumnDropdown {...props[0]} />
              </Col>
              <Col lg="1" />
              <Col lg="5">
                <ColumnDropdown {...props[1]} />
              </Col>
            </Row>
            <Row className="mb-3">
              <Col lg="5">
                <ColumnDropdown {...props[2]} />
              </Col>
              <Col lg="1" />
              <Col lg="5">
                <ColumnDropdown {...props[3]} />
              </Col>
            </Row>
            <Row className="mb-3">
              <Col lg="5">
                <ColumnDropdown {...props[4]} />
              </Col>
              <Col lg="6" />
            </Row>
          </Form>

          <Row className="my-3 pt-3">
            <h5> Table Preview </h5>
            <TablePreview table={table} />
          </Row>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={backFn}>
          Back
        </Button>
        <Button variant="primary" onClick={onDone} disabled={!weGood}>
          Done
        </Button>
      </Modal.Footer>
    </>
  );
}

function ColumnDropdown({ table, name, val, setter, error, optional }) {
  return (
    <Form.Group className="mb-3" controlId={`Column-${name}`}>
      <Form.Label>Specify the {name} column</Form.Label>
      <Form.Control
        as="select"
        aria-label={`Select ${name} Column`}
        onChange={(e) => setter(e.target.value)}
        isInvalid={error !== null}
        value={val || ""}
      >
        <option value="" disabled>
          select a column
        </option>
        {optional && <option value="NOT_PRESENT"> None </option>}
        {table.cols.map((c) => (
          <option value={c.accessor} key={c.accessor}>
            {" "}
            {c.displayName}{" "}
          </option>
        ))}
      </Form.Control>
      {error === null ? null : (
        <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
      )}
    </Form.Group>
  );
}

function TablePreview({ table }) {
  return (
    <div className="preview-table">
      <TableStyles>
        <Table hover>
          <thead>
            <tr role="row">
              {table.cols.map((col, idx) => (
                <th key={idx} role="columnheader">
                  {col.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.slice(0, 10).map((row, idx) => (
              <tr role="row" key={idx}>
                {table.cols.map(({ accessor }, idx) => (
                  <td role="cell" key={idx}>
                    {row[accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </TableStyles>
    </div>
  );
}

function guessCol(type, table) {
  const guesses = {
    index: ["index", "order"],
    x: ["longitude"],
    y: ["latitude"],
    t: ["time", "timestamp", "date created"],
    dist: ["distance from last"],
  };

  if (!guesses[type]) return null;

  for (let { accessor } of table.cols) {
    if (guesses[type].includes(accessor.toLowerCase())) {
      return accessor;
    }
  }
  return null;
}
