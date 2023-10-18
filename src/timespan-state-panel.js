import React, {
  useRef,
  useMemo,
  useState,
} from "react";

import * as d3 from "d3";
import * as Slider from "rc-slider";
import "rc-slider/assets/index.css";
import debounce from "lodash.debounce";

import { Row, Col, Button, Container, Form } from "react-bootstrap";
import { hhmmss } from "./utils.js";
import { actions } from "./app-state.js";
import { TimespanState } from "./states/timespan-state.js";

const createSliderWithTooltip = Slider.createSliderWithTooltip;
const Range = createSliderWithTooltip(Slider.Range);

export function CreateTimespanWidget({ vizData, takenNames, dispatch }) {
  let [stateName, setStateName] = useState("");
  let selectedRange = useRef([0, vizData.length]);

  // TODO: can we get rid of this???????????
  // Whenever the underlying data updates, increment 'key', which is used to
  // force remounting the slider when the underlying data changes.
//   let key = useRef(0);
//   useEffect(() => {
//     key.current = key.current + 1;
//   }, [vizData]);

  // TODO: Figure out how to do this w/ 'marks' instead of tooltips.
  let tRange = vizData && d3.extent(vizData, (d) => d.Timestamp.getTime());
  let dataLength = vizData && vizData.length;

  let onCancel = () => dispatch(actions.cancelCreateTimespanState());

  // For the text box.
  let onChange = (e) => {
    let name = e.target.value;
    if (name.length > 20) return;
    setStateName(name);
  };

  let onSubmit = (e) => {
    let timespanState = new TimespanState(stateName, selectedRange.current);
    dispatch(actions.finishCreateTimespanState(timespanState))
  };

  //
  // Slider stuff.
  //
  let onSliderChange = debounce((val) => {
    selectedRange.current = val;
    dispatch(actions.highlightPoints([val]));
  }, 10);

  // Tooltip formatter for the Range/slider
  let tipFormatter = useMemo(() => {
    let [tMin, tMax] = tRange;
    return (val) => hhmmss(new Date(tMin + (val / dataLength) * (tMax - tMin)));
  }, [tRange, dataLength]);

  // Props for the Range component (i.e., slider).
  let rangeProps = {
    max: dataLength,
    defaultValue: [0, dataLength],
    allowCross: false,
    draggableTrack: true,
    // onChange: debounce((val) => dispatch(actions.changeTimespan(val)), 18),
    onChange: onSliderChange,
    tipFormatter,
  };

  // Possibly unnecessary! yay!
  let slider = useMemo(
    () => <Range {...rangeProps} />,
    [tRange, dataLength, dispatch]
  );

  return (
    <Container className="mx-3 px-3 py-3">
      <Row className="mb-3">
        <Col>
          <h3>Create a Timespan State</h3>
        </Col>
        <Col xs={2}>
          <Button variant="link" size="sm" onClick={onCancel}>
            cancel
          </Button>
        </Col>
      </Row>
      <Row className="mb-3 pb-3">
        <Col>{vizData && slider}</Col>
        <Col xs={1}></Col>
      </Row>
      <Row className="mt-3">
        <Form onSubmit={(e) => e.preventDefault()} className="form-horizontal">
          <Form.Group as={Row} className="mb-3" controlId="stateName">
            <Form.Label column sm={2}>
              <span style={{ fontWeight: "bold" }}>Name: </span>
            </Form.Label>
            <Col sm={5}>
              <Form.Control
                as="input"
                type="text"
                placeholder="Timespan Name"
                isInvalid={takenNames.includes(stateName)}
                autoFocus
                htmlSize="10"
                value={stateName}
                onChange={onChange}
              />
              <Form.Control.Feedback type="invalid">
                State with name "{stateName}" already exists.
              </Form.Control.Feedback>
            </Col>
            <Col sm={2}>
              <Button
                onClick={onSubmit}
                disabled={!stateName || takenNames.includes(stateName)}
              >
                Create
              </Button>
            </Col>
          </Form.Group>
        </Form>
      </Row>
    </Container>
  );
}
