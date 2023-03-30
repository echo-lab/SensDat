import { useState } from "react";
import { Form, Table } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { getSequenceInfo, hhmmss, TableStyles } from "./utils.js";

const TIME_COLS = ["START_TIME", "END_TIME"];

export function SequenceEditor({ rows, cols, setSequence, onClose }) {
  let [range, setRange] = useState([-1, -1]);
  let [seqName, setSeqName] = useState("");
  let [step, setStep] = useState("SELECT");

  let tableProps = { rows, cols, range, setRange, seqName, setSeqName };

  let onComplete = () => {
    let [lo, hi] = range;
    let seq =
      lo < 0
        ? []
        : rows.map((r) => r.STATE).filter((_, idx) => lo <= idx && idx <= hi);
    setSequence({ name: seqName, seq });
    onClose();
  };

  return (
    <Modal show={true} onHide={onClose} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Define Your Sequence</Modal.Title>
      </Modal.Header>
      <Modal.Body className="y-scroll-modal">
        {step === "SELECT" ? (
          <h4>Drag your mouse to select a sequence</h4>
        ) : (
          <h4>Verify your sequence looks correct and give it a name</h4>
        )}
        <TableStyles>
          {step === "SELECT" ? (
            <SelectableTable {...tableProps} />
          ) : (
            <TableWithSequence {...tableProps} />
          )}
        </TableStyles>
      </Modal.Body>
      <Modal.Footer>
        {step === "SELECT" ? (
          <>
            <Button variant="outline-secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => setStep("CONFIRM")}
              disabled={range[0] < 0}
            >
              Next
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline-secondary"
              onClick={() => setStep("SELECT")}
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={onComplete}
              disabled={seqName.length === 0}
            >
              Done
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}

function SelectableTable({ rows, cols, range, setRange }) {
  let [dragging, setDragging] = useState(false);
  let [startIdx, setStartIdx] = useState(-1);

  let [lo, hi] = range;

  let onMouseDown = (idx) => {
    setDragging(true);
    setStartIdx(idx);
    setRange([idx, idx]);
  };

  let onMouseEnter = (idx) => {
    if (!dragging) return;
    idx <= startIdx ? setRange([idx, startIdx]) : setRange([startIdx, idx]);
  };

  let onMouseUp = () => setDragging(false);

  return (
    <Table
      onMouseUp={onMouseUp}
      className="prevent-select"
      style={{ cursor: "pointer" }}
    >
      <thead>
        <tr role="row">
          {cols.map((col, idx) => (
            <th key={idx} role="columnheader">
              {col.Header === "State" ? "State(s)" : col.Header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr
            role="row"
            key={idx}
            onMouseDown={() => onMouseDown(idx)}
            onMouseEnter={() => onMouseEnter(idx)}
            className={lo <= idx && idx <= hi ? "selected-row" : ""}
          >
            {cols.map(({ accessor }, idx) => {
              if (row[accessor] === undefined) return null;
              if (TIME_COLS.includes(accessor)) {
                return (
                  <td role="cell" key={idx} className={idx}>
                    {hhmmss(row[accessor])}
                  </td>
                );
              } else {
                return (
                  <td role="cell" key={idx} className={idx}>
                    {row[accessor]}
                  </td>
                );
              }
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function TableWithSequence({ rows, cols, range, seqName, setSeqName }) {
  let [lo, hi] = range;

  let stateSeq = rows.map((r) => r.STATE);
  let targetSeq = stateSeq.filter((_, idx) => lo <= idx && idx <= hi);

  let seqNums = getSequenceInfo(stateSeq, targetSeq);

  return (
    <Table className="prevent-select">
      <thead>
        <tr role="row">
          <th key="stateSeq">
            <Form.Control
              as="input"
              type="text"
              placeholder="Enter a name"
              autoFocus
              size="sm"
              htmlSize="12"
              maxLength="30"
              isInvalid={seqName === ""}
              value={seqName}
              onChange={(e) => setSeqName(e.target.value)}
            />
          </th>
          {cols.map((col, idx) => (
            <th key={idx} role="columnheader">
              {col.Header === "State" ? "State(s)" : col.Header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr role="row" key={idx}>
            {(idx === 0 || seqNums[idx].seqNum !== seqNums[idx - 1].seqNum) && (
              <td role="cell" rowSpan={seqNums[idx].nextSeq}>
                {seqNums[idx].seqNum > 0 ? seqNums[idx].seqNum : "--"}
              </td>
            )}
            {cols.map(({ accessor }, idx) => {
              if (row[accessor] === undefined) return null;
              if (TIME_COLS.includes(accessor)) {
                return (
                  <td role="cell" key={idx} className={idx}>
                    {hhmmss(row[accessor])}
                  </td>
                );
              } else {
                return (
                  <td role="cell" key={idx} className={idx}>
                    {row[accessor]}
                  </td>
                );
              }
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
