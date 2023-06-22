import React, { useState, useRef } from "react";

import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import { Overlay, Tooltip } from 'react-bootstrap';
import { actions } from "./app-state.js";
import { ConditionState } from "./states/condition-state.js";
import { VirtualizedTable } from "./data-view.js";
import { DataTable } from "./data-table.js";
const esprima = require('esprima');

// This controls the performance of Create Conditional State interaction
export function ConditionStatePane({
    dataTable,
    dispatch,
}){
    const [expressionValue, setExpressionValue] = useState('');
    const [response, setResponse] = useState("");
    const [ready, setReady] = useState(false);

    // the filteredData contains only the rows that fits the input condition
    const [filteredData, setFilteredData] = useState(dataTable);
    
    const onCancel = () => {
        dispatch(actions.cancelCreateConditionState(null));
    }

    // create a condition-state object
    const onCreate = () => {
        dispatch(actions.CreateConditionState(new ConditionState(expressionValue, filteredData.rows, dataTable.rows)));
    }

    const onSelect = (buttonText) => {
        setExpressionValue(pre => pre + buttonText);
    }
    // Dependencies of AutoCompleteBox
    const AutoCompleteBoxProps = {
        dataTable,
        expressionValue,
        setExpressionValue,
        setResponse,
        setReady,
        setFilteredData,
        dispatch,
    }

    // not sure if we need this...
    let highlightFn = (points) => dispatch(actions.highlightPoints(points));
    let showPointsFn = (pointsRange) => dispatch(actions.setShownPoints(pointsRange));

    const options = dataTable.cols.map((x) => x.displayName);
    return(
        <Container>
            <h2 className="text-center"> Create Condition State </h2>
            <Container>
                <Row>
                    <hr />
                    <Form>
                        {options.map((i)=>(<><Button variant="primary" key={i} size='sm' onClick={() => onSelect(i)}>{i}</Button>{' '}</>))}
                        <AutoCompleteBox {...AutoCompleteBoxProps}/>
                        <hr/>
                        <Form.Text className="text-muted">
                            Corresponding javascript expression feedback
                        </Form.Text>
                        <Form.Control type="text" 
                            placeholder="NULL" 
                            value = {response}
                            readOnly 
                            disabled>
                        </Form.Control>
                        <hr/>
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
                            onClick={onCreate}
                            disabled = {!ready}
                        >
                            Create
                        </Button>
                        <hr/>
                        <Form.Text className="text-muted">
                            Corresponding table content
                        </Form.Text>
                        <VirtualizedTable
                            dataTable={filteredData}
                            highlightFn={highlightFn}
                            showPointsFn={showPointsFn}
                        />
                    </Form>
                </Row>
            </Container>
            
        </Container>
    )
}

// This is the auto-complete text box
// maybe we could make interactable chunks instead
function AutoCompleteBox({
    dataTable,
    expressionValue,
    setExpressionValue,
    setResponse,
    setReady,
    setFilteredData,
    dispatch,
})
{
    const [showSuggestion, setShowSuggestion] = useState(false);
    const [suggestion, setSuggestion] = useState('');
    const inputBoxRef = useRef(null);

    // Define the suggestions to be current columns and states, and operators
    let suggestions = dataTable.cols.map((x) => {
        return x.displayName;
    });

    // this handles the performance of Response Text and suggestions
    const handleChange = (event) => {
        const input = event.target.value;
        const lastWord = input.split(' ').pop();

        if (lastWord === '') {
        setShowSuggestion(false);
        } else {
        const filteredSuggestions = suggestions.filter((suggestion) => {
            return suggestion.toLowerCase().startsWith(lastWord.toLowerCase());
        });

        if (filteredSuggestions.length > 0) {
            setShowSuggestion(true);
            setSuggestion(filteredSuggestions[0]);
        } else {
            setShowSuggestion(false);
        }
        }

        setExpressionValue(input);
        try{
            const allowedTokens = dataTable.cols.map((x) => x.displayName);
            setFilteredData(DataTable.fromRowsCols(filterList(dataTable.rows, input, allowedTokens), dataTable.cols));
            setResponse("Correct");
            setReady(true);
            //dispatch(actions.highlightPoints(filterList(dataTable.rows, input, allowedTokens)));
        }
        catch(e){
            setFilteredData(dataTable);
            setReady(false);
            setResponse(e);
            if(input.length === 0){
                setResponse("NULL");
            }
            //dispatch(actions.highlightPoints());
        }
    };

    const handleSelectSuggestion = () => {
        const input = expressionValue.trim();
        const lastWordStartIndex = input.lastIndexOf(' ') + 1;
        const newValue =
        input.substring(0, lastWordStartIndex) + suggestion + ' ';

        setExpressionValue(newValue);
        setShowSuggestion(false);
    };

    const handleKeyDown = (e) =>{
        if (e.key === "Tab"){
            e.preventDefault();
            if (showSuggestion){
                handleSelectSuggestion();
            }
        }
    }

    return(
        <div>
        <Form.Control
            type="text"
            onKeyDown={handleKeyDown}
            value={expressionValue}
            onChange={handleChange}
            placeholder="Type JS boolean expression here..."
            ref={inputBoxRef}
        />
        <Overlay
            show={showSuggestion}
            placement="bottom-start"
            target={inputBoxRef.current}
        >
            <Tooltip onClick={handleSelectSuggestion}>{suggestion}</Tooltip>
        </Overlay>
        </div>
    );
}

// Filter the list with an expression String and a list of allowedIdentifiers
export const filterList= (list, expression, allowedIdentifiers) => {
    const ast = esprima.parseScript(expression);
    function evaluateNode(node, context) {
        switch (node.type) {
            case 'Program':
                return node.body.map((n) => evaluateNode(n, context));
            case 'ExpressionStatement':
                return evaluateNode(node.expression, context);
            case 'BinaryExpression':
                const left = evaluateNode(node.left, context);
                const right = evaluateNode(node.right, context);
                
                // Evaluate arithmetic operators first (Addition, Subtraction, Multiplication, Division, Modulus)
                let result;
                switch (node.operator) {
                case '+': result = left + right; break;
                case '-': result = left - right; break;
                case '*': result = left * right; break;
                case '/': result = left / right; break;
                case '%': result = left % right; break;
                default: result = null;
                }
                
                // If an arithmetic operation was performed, return the result.
                if (result !== null) {
                return result;
                }
                
                // Evaluate comparison and logical operators
                switch (node.operator) {
                case '==': return left == right; // Should we keep this one?
                case '!=': return left != right; // and this one?
                case '===': return left === right;
                case '!==': return left !== right;
                case '<': return left < right;
                case '<=': return left <= right;
                case '>': return left > right;
                case '>=': return left >= right;
                case '&&': return left && right;
                case '||': return left || right;
                default: throw new Error(`Unknown operator: ${node.operator}`);
                }
            case 'Identifier':
                if (!allowedIdentifiers.includes(node.name)) {
                    const match = allowedIdentifiers.find(i => i.toLowerCase() === node.name.toLowerCase());
                    if (match){
                        node.name = match;
                    }
                    else {
                        throw new Error(`Unknown identifier: ${node.name}`);
                    }
                }
                return context[node.name];
            case 'Literal':
                return node.value;
            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }
    const filteredList = list.filter((obj) => evaluateNode(ast.body[0].expression, obj));
    return filteredList;
}
  
