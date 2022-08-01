import React, { useState, useEffect } from "react";

import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

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
    advanceStep: ()=>setStep(DEFINE_COMPOUND_STATE),
  };

  let defineCompoundStateProps = {
    chosenStates,
    dimensions,
    dataTable,
    dispatch
  };

  return (
    <Container>
    <div className="compound-state-container debug def-visible">
      { step === CHOOSE_STATES ? (
        <PickTwoStates {...pickTwoStatesProps} />
      ) : (
        <DefineCompoundStateScreen {...defineCompoundStateProps} />
      )
      }
    </div>
    </Container>
  );
}

function PickTwoStates(
  {userDefinedStates, chosenStates, toggleChosenState, advanceStep}) {
  return (
    <Form>
      <h3> Choose two states: </h3>
      <div className="mb-3">
      {userDefinedStates.map(s=> (
        <Form.Check
          type="checkbox"
          id="choose-two-states"
          label={s.name}
          key={s.id}
          onClick={toggleChosenState(s)}
          disabled={!chosenStates.includes(s) && chosenStates.length >= 2}
        />
      ))}
      <Button
        variant="primary"
        sz="lg"
        onClick={advanceStep}
        disabled={chosenStates.length !== 2}
      >
        Next
      </Button>

      </div>
    </Form>
  );
}

function DefineCompoundStateScreen({
  chosenStates, dimensions, dataTable, dispatch
}) {
  // NOTE: must reset if dataTable or chosenStates changes.
  // Or like... if we come back to this screen after being absent?
  let [compoundState, setCompoundState] = useState(new CompoundState(...chosenStates, [], []));
  let [selectedNodes, selectedEdges] = [compoundState.nodes, compoundState.edges];

  useEffect(()=>{
    setCompoundState(new CompoundState(...chosenStates, [], []));
    // TODO: ALSO: set the possible states...??
  }, [dataTable, chosenStates]);

  // TODO: Some of this can be memoized and sped up :D
  let [existingNodes, existingEdges] = compoundState.getPossibleNodesAndEdges(dataTable);

  useEffect(()=>{
    let pts = compoundState.getChosenPoints(dataTable);
    dispatch(actions.highlightPoints(pts));
  }, [dataTable, compoundState, dispatch]);

  const svgWidth = (dimensions.width * 0.97) || 500;
  const svgHeight = (dimensions.height * 0.9 - 50) || 300;

  if (chosenStates.length !== 2) return null;

  let toggleNode = node => setCompoundState(compoundState.toggleNode(node));
  let toggleEdge = edge => setCompoundState(compoundState.toggleEdge(edge));

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
    <Container>
      <h2 className="text-center"> Create Compound State </h2>
      <Row>
      <svg style={svgStyle} className="mb-3" xmlns="http://www.w3.org/2000/svg">
        <StateMachineWidget {...stateMachineProps} />
      </svg>
      </Row>
      <Row>
        <Col />
        <Col xs={6} className="text-center">
          <Button variant="primary" sz="lg" className="mx-2">Back</Button>
          <Button variant="primary" sz="lg" className="mx-2">Create State</Button>
        </Col>
        <Col />
      </Row>
    </Container>
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
  if (m[v1] === "TRUE" && m[v2] === "TRUE") {
    innerText = (
      <>
      <tspan x={cx} dy="-1.0em">
        {s1.name}
      </tspan>
      <tspan x={cx} dy="1.5em">
        AND
      </tspan>
      <tspan x={cx} dy="1.5em">
        {s2.name}
      </tspan>
      </>
    );
  } else if (m[v1] !== m[v2]) {
    innerText = (
        <tspan x={cx} dy="0.3em" >
          {m[v1] === "TRUE" ? s1.name : s2.name}
        </tspan>
      );
  } else {
    innerText = (
      <>
      <tspan x={cx} dy="-1.9em">
        NEITHER
      </tspan>
      <tspan x={cx} dy="1.4em">
        {s1.name}
      </tspan>
      <tspan x={cx} dy="1.4em">
        NOR
      </tspan>
      <tspan x={cx} dy="1.4em">
        {s2.name}
      </tspan>
      </>
    );
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
        {innerText}
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
