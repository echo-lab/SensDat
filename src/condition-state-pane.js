import React, { useState, useRef, useCallback } from "react";
import './styles/condition-state-pane.css';
import * as esprima from "esprima";

import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import { Overlay, Tooltip } from 'react-bootstrap';
import { actions } from "./app-state.js";
import { ConditionState } from "./states/condition-state.js";
import { useTable, useBlockLayout } from "react-table";
import { FixedSizeList } from "react-window";
import { TableStyles } from "./utils.js";
import { DataTable } from "./data-table.js";

// This controls the performance of Create Conditional State interaction
export function ConditionStatePane({
    dataTable,
    dispatch,
}){
    const [expressionValue, setExpressionValue] = useState('');
    const [response, setResponse] = useState("NULL");
    const [ready, setReady] = useState(false);
    const [shortTableView, setShortTableView] = useState(false);
    // the filteredData is a Datatable that contains only the rows that fits the input condition
    const [filteredData, setFilteredData] = useState([]);
    
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
    
    const onSwitch= () => {
        if (shortTableView) setShortTableView(false);
        else setShortTableView(true);
    }

    let highlightFn = (points) => dispatch(actions.highlightPoints(points));

    // Dependencies of AutoCompleteBox
    const AutoCompleteBoxProps = {
      dataTable,
      expressionValue,
      setExpressionValue,
      setResponse,
      setReady,
      setFilteredData,
      highlightFn,
      dispatch,
    }

    const options = dataTable.cols.map((x) => x.displayName);
    return(
        <Container>
            <h2 className="text-center"> Create Condition State </h2>
            <Container>
                <Row>
                    <Form>
                        {options.map((i)=>i === "Time"||i === "Date Created"?<></>:(<><Button className="mb-1" variant="primary" key={i} size='sm' onClick={() => onSelect(i)}>{i}</Button>{' '}</>))}
                        <AutoCompleteBox {...AutoCompleteBoxProps}/>
                        <Form.Control 
                          type="text" 
                          placeholder="NULL" 
                          value = {response}
                          className={
                            response === "NULL"
                                ? "input-primary"
                                : response === "Correct"
                                    ? "input-success"
                                    : "input-danger"
                        }
                          readOnly 
                          disabled>
                        </Form.Control>
                        <div className="d-flex justify-content-end">
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
                        </div>
                        <Form.Check
                          id = "table-display-checkbox"
                          type="checkbox"
                          label= {"View selected rows only (" + filteredData.length + " data points are selected)"}
                          checked = {shortTableView}
                          onChange= {onSwitch}
                        />
                        {shortTableView?
                            <CFVirtualizedTable
                              dataTable={filteredData.length === 0?dataTable:filteredData}
                              highlightRows={filteredData.length === 0?[]:[[1, filteredData.length + 1]]}
                              applyHighlight={true}/>:
                            <CFVirtualizedTable
                              dataTable={dataTable}
                              highlightRows={getRanges(filteredData.rows)}
                              applyHighlight={response === "Correct"}/>
                            }
                        
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
    highlightFn,
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

    // This handles the performance of Response Text and suggestions
    // contains most page behavior (filter data, show suggestion, 
    // response bar, highlight points)
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
            highlightFn(getRanges(filterList(dataTable.rows, input, allowedTokens)));
        }
        catch(e){
            setFilteredData([]);
            setReady(false);
            setResponse(e);
            if(input.length === 0){
                setResponse("NULL");
            }
            highlightFn([[-1, -1]]);
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
// This function uses esprima to parse the script, but code texts is not 
// excuted by it
export const filterList= (list, expression, allowedIdentifiers) => {
    // Replace spaces in identifiers with underscores in the expression string
  allowedIdentifiers.forEach(identifier => {
    const identifierWithUnderscore = identifier.replace(/ /g, '_');
    expression = expression.split(identifier).join(identifierWithUnderscore);
  });
  allowedIdentifiers = allowedIdentifiers.filter(identifier => identifier !== "Time");
  const ast = esprima.parseScript(expression);

  function evaluateNode(node, context) {
    switch (node.type) {
      case 'Program':
        return node.body.map(n => evaluateNode(n, context));
      case 'ExpressionStatement':
        return evaluateNode(node.expression, context);
      case 'BinaryExpression':
      case 'LogicalExpression':
        const left = evaluateNode(node.left, context);
        const right = evaluateNode(node.right, context);
        switch (node.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return left / right;
          case '%': return left % right;
          case '==': return left == right;
          case '!=': return left != right;
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
        let identifier = node.name.replace(/_/g, ' ');
        if (!allowedIdentifiers.includes(identifier)) {
          const match = allowedIdentifiers.find(i => i.toLowerCase() === identifier.toLowerCase());
          if (match){
            identifier = match;
          }
          else {
            throw new Error(`Unknown identifier: ${identifier}`);
          }
        }
        return context[identifier];
      case 'Literal':
        return node.value;
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }
    
    const filteredList = list.filter((obj) => evaluateNode(ast.body[0].expression, obj));
    return filteredList;
}

// Helper function that turns filtered datatable into a list of ranges to use show points funcition
function getRanges(filtered){
  let ranges = [];
  if (!filtered || filtered.length <= 0) return ranges;

  let startPoint = filtered[0].Order;
  let endPoint = filtered[0].Order;
  for (let i=1; i<filtered.length; i++){
    let order = filtered[i].Order;
    if (order === endPoint + 1){
      endPoint++;
    }
    else{
      ranges.push([startPoint, endPoint]);
      startPoint = order;
      endPoint = order;
    }
  }
  ranges.push([startPoint, endPoint]);
  return ranges;
}


// This is pretty much copied & pasted from VirtualizedTable with hightlight
// and show points functions removed and highlight rows function implemented
function CFVirtualizedTable({ dataTable, highlightRows, applyHighlight }) {
    const scrollBarSize = React.useMemo(() => scrollbarWidth(), []);
  
    // These need to be memo-ized to prevent constant re-rendering
    const columns = React.useMemo(() => {
      return dataTable ? dataTable.getReactTableCols() : [];
    }, [dataTable]);
    const data = React.useMemo(() => {
      return dataTable ? dataTable.getReactTableData() : [];
    }, [dataTable]);
  
    const {
      getTableProps,
      getTableBodyProps,
      headerGroups,
      rows,
      totalColumnsWidth,
      prepareRow,
    } = useTable(
      {
        columns,
        data,
      },
      useBlockLayout
    );
  
    const RenderRow = useCallback(
      ({ index, style }) => {
        const row = rows[index];
        prepareRow(row);
    
        // Check if this row index falls within any of the provided ranges
        let isHighlighted = false;
        if (applyHighlight) {  // Only check for highlighting if applyHighlight is true
          for (let range of highlightRows) {
            if (index + 1 >= range[0] && index + 1 <= range[1]) { // Index + 1 here is to fit Order number with index number
              isHighlighted = true;
              break;
            }
          }
        }
    
        return (
          <div
            {...row.getRowProps({
              style,
            })}
            className={`tr ${isHighlighted ? "highlighted" : ""}`}
          >
            {row.cells.map((cell) => {
              // This is where each cell gets rendered.
              return (
                <div {...cell.getCellProps()} className="td">
                  {cell.render("Cell")}
                </div>
              );
            })}
          </div>
        );
      },
      [prepareRow, rows, highlightRows, applyHighlight]
    );
    
  
    return (
      <TableStyles>
        <div {...getTableProps()} className="table">
          <div>
            {headerGroups.map((headerGroup) => (
              <div
                {...headerGroup.getHeaderGroupProps()}
                className="tr table-header"
              >
                {headerGroup.headers.map((column) => (
                  <div {...column.getHeaderProps()} className={"th " + column.render('Header').replace(/\s/g, '')}>
                    {column.render("Header")}
                  </div>
                ))}
              </div>
            ))}
          </div>
  
          <div {...getTableBodyProps()}>
            <FixedSizeList
              height={400}
              itemCount={rows.length}
              itemSize={35}
              width={totalColumnsWidth + scrollBarSize}
              overscanCount={25}
            >
              {RenderRow}
            </FixedSizeList>
          </div>
        </div>
      </TableStyles>
    );
  }
  
  const scrollbarWidth = () => {
    // from: https://davidwalsh.name/detect-scrollbar-width
    const scrollDiv = document.createElement("div");
    scrollDiv.setAttribute(
      "style",
      "width: 100px; height: 100px; overflow: scroll; position:absolute; top:-9999px;"
    );
    document.body.appendChild(scrollDiv);
    const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    document.body.removeChild(scrollDiv);
    return scrollbarWidth;
  };