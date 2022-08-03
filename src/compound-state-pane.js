import React, { useState, useEffect, useRef } from "react";

import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';

import { actions } from "./app-state.js";
import { CompoundState } from "./states/compound-state.js";

// Define different steps. This is a lazy enum lol.
const CHOOSE_STATES = 1;
const DEFINE_COMPOUND_STATE = 2;

// Variables controlling how the nodes look.
const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;

export function CompoundStatePane(
  {dimensions, userDefinedStates, dispatch, dataTable}) {
  // OKAY! We need three different screens: pick-two-states; SM-rep; name.
  // OR: two (combine name/SM-rep)

  let [chosenStates, setChosenStates] = useState([]);
  let [step, setStep] = useState(CHOOSE_STATES);

  let toggleChosenState = s => () => {
    if (chosenStates.includes(s)) {
      setChosenStates(chosenStates.filter(cs=>cs !== s));
    } else if (chosenStates.length < 2) {
      setChosenStates([...chosenStates, s]);
    } else {
      console.log("D'oh! Shouldn't be able to get here...");
    }
  };

  let pickTwoStatesProps = {
    userDefinedStates,
    chosenStates,
    toggleChosenState,
    onCancel: ()=>dispatch(actions.cancelCreateCompoundState(null)),
    advanceStep: ()=>setStep(DEFINE_COMPOUND_STATE),
  };

  let defineCompoundStateProps = {
    chosenStates,
    dimensions,
    dataTable,
    dispatch,
    goBack: ()=>setStep(CHOOSE_STATES),
  };

  return (
    <Container>
    <h2 className="text-center"> Create Compound State </h2>
      { step === CHOOSE_STATES ? (
        <PickTwoStates {...pickTwoStatesProps} />
      ) : (
        <DefineCompoundStateScreen {...defineCompoundStateProps} />
      )
      }
    </Container>
  );
}

function PickTwoStates(
  {userDefinedStates, chosenStates, toggleChosenState, advanceStep, onCancel}) {
  return (
    <Container className="p-3">
    <Row>
    <hr />
    <Form>
      <h4 className="mb-3"> Choose two states: </h4>
      {userDefinedStates.map(s=> (
        <Form.Check
          type="checkbox"
          id="choose-two-states"
          className="mb-1"
          label={s.name}
          key={s.id}
          onClick={toggleChosenState(s)}
          defaultChecked={chosenStates.includes(s)}
          disabled={!chosenStates.includes(s) && chosenStates.length >= 2}
        />
      ))}
      <Button
        className="mt-3"
        variant="outline-secondary"
        sz="lg"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        className="mt-3 mx-3"
        variant="primary"
        sz="lg"
        onClick={advanceStep}
        disabled={chosenStates.length !== 2}
      >
        Next
      </Button>
    </Form>
    </Row>
    </Container>
  );
}

function DefineCompoundStateScreen({
  chosenStates, dimensions, dataTable, dispatch, goBack
}) {
  // NOTE: must reset if dataTable or chosenStates changes.
  // Or like... if we come back to this screen after being absent?
  let [compoundState, setCompoundState] = useState(new CompoundState(...chosenStates, [], []));
  let [showModal, setShowModal] = useState(false);
  let [selectedNodes, selectedEdges] = [compoundState.nodes, compoundState.edges];
  let pts = useRef([]);

  useEffect(()=>{
    setCompoundState(new CompoundState(...chosenStates, [], []));
    // TODO: ALSO: set the possible states...??
  }, [dataTable, chosenStates]);

  // TODO: Some of this can be memoized and sped up :D
  let [existingNodes, existingEdges] = compoundState.getPossibleNodesAndEdges(dataTable);

  useEffect(()=>{
    pts.current = compoundState.getChosenPoints(dataTable);
    dispatch(actions.highlightPoints(pts.current));
  }, [dataTable, compoundState, dispatch]);

  // Somehow, this plus the viewBox attribute means the SVG scales properly
  // if we make it really small...
  const svgWidth = Math.max((dimensions.width * 0.97) || 500, 400);
  const svgHeight = Math.max((dimensions.height * 0.9 - 50) || 300, 240);

  if (chosenStates.length !== 2) return null;

  let toggleNode = node => setCompoundState(compoundState.toggleNode(node));
  let toggleEdge = edge => setCompoundState(compoundState.toggleEdge(edge));

  let onGoBack = () => {
    goBack();
    dispatch(actions.highlightPoints([]));
  };

  let onCloseModal = () => {
    setShowModal(false);
  };

  let commitNewState = (name) => {
    dispatch(actions.createCompoundState(compoundState.withName(name)));
  };

  // Need all da data PLUS which two states were chosen.
  // Need to recalculate everything each time the data/chosen states change.
  const svgStyle = {
    height: svgHeight,
    width: svgWidth,
    marginRight: "0px",
    marginLeft: "0px",
    border: "solid 1px black",
  };

  let stateMachineProps = {
    width: svgWidth,
    height: svgHeight,
    chosenStates,
    existingNodes,
    existingEdges,
    selectedNodes,
    selectedEdges,
    toggleNode,
    toggleEdge
  };

  return (
    <>
    <Container>
      <Row className="text-center">
      <svg
        style={svgStyle}
        className="mb-3"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg">
        <StateMachineWidget {...stateMachineProps} />
      </svg>
      </Row>
      <Row>
        <Col />
        <Col xs={6} className="text-center">
          <Button variant="outline-secondary" sz="lg" className="mx-2" onClick={onGoBack}>Back</Button>
          <Button
            variant="primary"
            sz="lg"
            className="mx-2"
            onClick={()=>setShowModal(true)}
            disabled={pts.current.length === 0}
          >
            Create State
          </Button>
        </Col>
        <Col />
      </Row>
    </Container>
    <StateNameModal show={showModal} onClose={onCloseModal} commit={commitNewState} />
    </>
  );
}

function StateNameModal({show, onClose, commit}) {
  let [stateName, setStateName] = useState("");

  let closeFn = () => {
    setStateName("");
    onClose();
  };

  let onChange = (e) => {
    let name = e.target.value;
    if (name.length <= 20) setStateName(name);
  };

  let onSubmit = () => commit(stateName);

  return (
    <Modal show={show} onHide={closeFn}>
      <Modal.Header closeButton>
        <Modal.Title>Name your new state</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={e => e.preventDefault()} className="form-horizontal">
          <Form.Control
            as="input"
            type="text"
            placeholder="Compound State Name"
            autoFocus
            htmlSize="10"
            value={stateName}
            onChange={onChange}
          />
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={closeFn}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={stateName === ""}
        >
          Create Compound State
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function StateMachineWidget({
    width, height, chosenStates, existingNodes, existingEdges,
    selectedNodes, selectedEdges, toggleNode, toggleEdge
  }) {

  let xOffset = width/4;
  let yOffset = height/4;

  let stateToPoint = ([s1, s2]) => ([
      (s1 === "T" ? -1 : 1) * xOffset,
      (s2 === "T" ? 1 : -1) * yOffset,
    ]);

  return (
    <g
      transform={`translate(${width/2} ${height/2})`}
      className="SMWidget unselectable"
      >
      <defs>
        <marker id="triangle" viewBox="0 0 10 10"
              refX="6" refY="5"
              markerUnits="strokeWidth"
              markerWidth="3" markerHeight="3"
              orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="grey"/>
        </marker>
        <marker id="selectedtriangle" viewBox="0 0 10 10"
              refX="6" refY="5"
              markerUnits="strokeWidth"
              markerWidth="3" markerHeight="3"
              orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="green"/>
        </marker>
      </defs>
      {
        existingNodes.map(s1s2 => (
          <StateNode
            cx={stateToPoint(s1s2)[0]}
            cy={stateToPoint(s1s2)[1]}
            states={chosenStates}
            stateValues={s1s2}
            isSelected={selectedNodes.includes(s1s2)}
            onSelect={()=>toggleNode(s1s2)}
            key={s1s2}
          />
        ))
      }
      {
        existingEdges.map(edge => (
          <ArrowTo
            p1={stateToPoint(edge.substring(0, 2))}
            p2={stateToPoint(edge.substring(2, 4))}
            isSelected={selectedEdges.includes(edge)}
            onSelect={()=>toggleEdge(edge)}
            key={edge}
          />
        ))
      }
    </g>
  );
}


function StateNode({cx, cy, r, states, stateValues, isSelected, onSelect}) {
  let [s1, s2] = states;
  let [v1, v2] = stateValues;
  let m = {"T": "TRUE", "F": "FALSE"};

  let innerText;
  if (m[v1] !== m[v2]) {
    innerText = m[v1] === "TRUE" ? s1.name : s2.name;
  } else if (m[v1] === "TRUE") {
    innerText = "BOTH";
  } else {
    innerText = "NEITHER";
  }

  return (
    <>
      <rect
        x={cx-NODE_WIDTH/2}
        y={cy-NODE_HEIGHT/2}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={50}
        onClick={onSelect}
        style={
          {
            fill: "white",
            stroke: isSelected ? "green" : "black",
            strokeWidth: isSelected ? 5 : 1,
          }
        }
      />
      <text
        textAnchor="middle"
        onClick={onSelect}
        x={cx} y={cy}
      >
        <tspan x={cx} dy="0.3em" >
          {innerText}
        </tspan>
      </text>
    </>
  );
}


function ArrowTo({p1, p2, isSelected, onSelect}) {
  let [sourceX, sourceY] = p1;
  let [targetX, targetY] = p2;

  let [x1, y1] = [0, 0];
  let [x2, y2] = [0, 0];
  let [ctrlX, ctrlY] = [0, 0];

  const CTRL_DX = 50;
  const CTRL_DY = 30;
  const CTRL_DD = 20;
  const OFFSET = 13;
  const GAP = 8;

  let getOrthogonalVec = ([x1, y1], [x2, y2]) => {
     let [x, y] = [x2-x1, y2-y1];
     let v = Math.sqrt(1 / (y*y/x/x + 1));
     let u = -y*v/x;
     return [u, v];
  };

  // LOL - there is surely a better way...
  if (sourceY === targetY) {
    // horizontal

    if (sourceX < targetX) {
      [x1, y1] = [sourceX + NODE_WIDTH/2 + GAP, sourceY - OFFSET];
      [x2, y2] = [targetX - NODE_WIDTH/2 - GAP, sourceY - OFFSET];
      ctrlY = sourceY - CTRL_DY;
    } else {
      [x1, y1] = [sourceX - NODE_WIDTH/2 - GAP, sourceY + OFFSET];
      [x2, y2] = [targetX + NODE_WIDTH/2 + GAP, sourceY + OFFSET];
      ctrlY = sourceY + CTRL_DY;
    }
  } else if (sourceX === targetX) {
    // vertical

    if (sourceY < targetY) {
      [x1, y1] = [sourceX + OFFSET, sourceY + NODE_HEIGHT/2 + GAP];
      [x2, y2] = [sourceX + OFFSET, targetY - NODE_HEIGHT/2 - GAP];
      ctrlX = sourceX + CTRL_DX;
    } else {
      [x1, y1] = [sourceX - OFFSET, sourceY - NODE_HEIGHT/2 - GAP];
      [x2, y2] = [sourceX - OFFSET, targetY + NODE_HEIGHT/2 + GAP];
      ctrlX = sourceX - CTRL_DX;
    }
  } else if ((sourceX < targetX) === (sourceY < targetY)) {
    // UpperLeft <-> BottomRight

    if (sourceY < targetY) {
      // UpperLeft -> BottomRight
      [x1, y1] = [sourceX + NODE_WIDTH/2, sourceY + NODE_HEIGHT/2 - OFFSET];
      [x2, y2] = [targetX - NODE_WIDTH/2 + OFFSET, targetY - NODE_HEIGHT/2];
      [ctrlX, ctrlY] = [(x1+x2)/2, (y1+y2)/2];
      let [ox, oy] = getOrthogonalVec([x1, y1], [x2, y2]);
      [ctrlX, ctrlY] = [(x1+x2)/2 - ox*CTRL_DD, (y1+y2)/2 - oy*CTRL_DD];
    } else {
      // UpperLeft <- BottomRight
      [x1, y1] = [sourceX - NODE_WIDTH/2, sourceY - NODE_HEIGHT/2 + OFFSET];
      [x2, y2] = [targetX + NODE_WIDTH/2 - OFFSET, targetY + NODE_HEIGHT/2];
      let [ox, oy] = getOrthogonalVec([x1, y1], [x2, y2]);
      [ctrlX, ctrlY] = [(x1+x2)/2 + ox*CTRL_DD, (y1+y2)/2 + oy*CTRL_DD];
    }
  } else {
    // BottomLeft <-> TopRight

    if (sourceY > targetY) {
      // BottomLeft -> TopRIght
      [x1, y1] = [sourceX + NODE_WIDTH/2 - OFFSET, sourceY - NODE_HEIGHT/2];
      [x2, y2] = [targetX - NODE_WIDTH/2, targetY + NODE_HEIGHT/2 - OFFSET];
      let [ox, oy] = getOrthogonalVec([x1, y1], [x2, y2]);
      [ctrlX, ctrlY] = [(x1+x2)/2 - ox*CTRL_DD, (y1+y2)/2 - oy*CTRL_DD];
    } else {
      // BottomLeft -> TopRIght
      [x1, y1] = [sourceX - NODE_WIDTH/2 + OFFSET, sourceY + NODE_HEIGHT/2];
      [x2, y2] = [targetX + NODE_WIDTH/2, targetY - NODE_HEIGHT/2 + OFFSET];
      let [ox, oy] = getOrthogonalVec([x1, y1], [x2, y2]);
      [ctrlX, ctrlY] = [(x1+x2)/2 + ox*CTRL_DD, (y1+y2)/2 + oy*CTRL_DD];
    }
  }

  return (
    <path
      fill="none"
      stroke={isSelected ? "green" : "grey"}
      strokeWidth={isSelected ? "6px" : "4px"}
      onClick={onSelect}
      markerEnd={isSelected ? "url(#selectedtriangle)" : "url(#triangle)"}
      vectorEffect="non-scaling-stroke"
      d={`M ${x1},${y1} Q ${ctrlX},${ctrlY} ${x2},${y2}`}
    />
  );
}
