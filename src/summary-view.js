import React, { useRef } from "react";
import { actions } from "./app-state.js";

import Form from 'react-bootstrap/Form'
import Button from "react-bootstrap/Button";

export function SummaryView({userDefinedStates, dispatch}) {

  let formRef = useRef();

  let onClick = () => {
    if (formRef.current.value === "invalid") {
      alert("Select a valid state");
    }
    dispatch(actions.createSummary(formRef.current.value));
  };

  let changeFn = (e) => {console.log(formRef.current.value)};

  return (
    <div className="summary-container debug">
      <h4 className="py-4 text-center"> Create New Summary </h4>
      <div className="m-4 text-center">
      <h6 className="mb-3">Summarize by:</h6>
      <Form.Control
        as="select" className="mb-4"
        ref={formRef} onChange={changeFn}
        defaultValue="invalid">
        <option value="invalid" disabled> -- Select a state -- </option>
        {
          userDefinedStates.map(s=>
            <option key={s.id} value={s.id}>{s.name}</option>
          )
        }
      </Form.Control>
      <Button variant="outline-dark" size="md" onClick={onClick}>
        Create
      </Button>
      </div>
    </div>
  );
}
