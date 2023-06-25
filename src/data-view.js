import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
} from "react";
import { useTable, useBlockLayout } from "react-table";
import { FixedSizeList } from "react-window";

import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";

import { actions } from "./app-state.js";
import { SummaryTab } from "./summary-table.js";
import { TableStyles } from "./utils.js";

import "./styles/data-view.css";
import { UIState } from "./ui-state.js";

export function DataView({
  dataTable,
  summaryTables,
  activeTab,
  userDefinedStates,
  uiState,
  dispatch,
}) {
  // Should absolutely NOT re-render this if we don't have to!!
  return useMemo(() => {
    let highlightFn = (points) =>
      uiState !== UIState.CreateTimespan &&
      dispatch(actions.highlightPoints(points));
    let showPointsFn = (pointsRange) =>
      dispatch(actions.setShownPoints(pointsRange));

    return (
      <div className="data-container debug def-visible">
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => dispatch(actions.selectTab(k))}
          className="m-3"
        >
          <Tab eventKey="BASE_TABLE" title="Base Table">
            <VirtualizedTable
              dataTable={dataTable}
              highlightFn={highlightFn}
              showPointsFn={showPointsFn}
            />
          </Tab>
          {summaryTables.map((st) => (
            <Tab eventKey={st.state.id} key={st.state.id} title={st.state.name}>
              <SummaryTab
                table={dataTable}
                state={st.state}
                userDefinedStates={userDefinedStates}
                highlightFn={highlightFn}
              />
            </Tab>
          ))}
        </Tabs>
      </div>
    );
  }, [dataTable, summaryTables, activeTab, userDefinedStates, dispatch, uiState]);
}

const IndeterminateCheckbox = forwardRef(({ indeterminate, ...rest }, ref) => {
  const defaultRef = useRef();
  const resolvedRef = ref || defaultRef;

  useEffect(() => {
    resolvedRef.current.indeterminate = indeterminate;
  }, [resolvedRef, indeterminate]);

  return (
    <div className="columnButton">
      <label className="columnButtonLabel">
        <input
          className="columnButtonInput"
          type="checkbox"
          ref={resolvedRef}
          {...rest}
        />
        <div className="columnButtonText">All</div>
      </label>
    </div>
  );
});

// This is pretty much copied from this example:
// https://react-table.tanstack.com/docs/examples/virtualized-rows
export function VirtualizedTable({ dataTable, highlightFn, showPointsFn }) {
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
    allColumns,
    getToggleHideAllColumnsProps,
  } = useTable(
    {
      columns,
      data,
    },
    useBlockLayout
  );

  let onItemsRendered = ({ visibleStartIndex, visibleStopIndex }) => {
    // This is off by up to 2 for some reason? Not sure how to debug... deafult
    // to just showing more points...
    showPointsFn([visibleStartIndex, visibleStopIndex + 3]);
    highlightFn([[-1, -1]]);
  };

  const RenderRow = useCallback(
    ({ index, style }) => {
      const row = rows[index];
      prepareRow(row);
      return (
        <div
          onMouseEnter={() =>
            highlightFn([[row.original.Order, row.original.Order]])
          }
          onMouseLeave={() => highlightFn([])}
          {...row.getRowProps({
            style,
          })}
          className="tr"
        >
          {row.cells.map((cell) => {
            const currentValue = cell.value;

            if (currentValue === "true" || currentValue === "false") {
              cell.value =
                currentValue.charAt(0).toUpperCase() + currentValue.slice(1);

              // This is where each cell gets rendered.
              return (
                <div {...cell.getCellProps()} className={"td " + cell.value}>
                  {cell.render("Cell")}
                </div>
              );
            } else {
              // This is where each cell gets rendered.
              return (
                <div {...cell.getCellProps()} className="td">
                  {cell.render("Cell")}
                </div>
              );
            }
          })}
        </div>
      );
    },
    [prepareRow, rows, highlightFn]
  );

  return (
    <TableStyles>
      <div className="columnButtonContainer">
        <IndeterminateCheckbox {...getToggleHideAllColumnsProps()} />
        {allColumns.map((column) => (
          <div className="columnButton" key={column.id}>
            <label className="columnButtonLabel">
              <input
                className="columnButtonInput"
                type="checkbox"
                {...column.getToggleHiddenProps()}
              />
              <div className="columnButtonText">{column.Header}</div>
            </label>
          </div>
        ))}
      </div>
      <div {...getTableProps()} className="table">
        <div>
          {headerGroups.map((headerGroup) => (
            <div
              {...headerGroup.getHeaderGroupProps()}
              className="tr table-header"
            >
              {headerGroup.headers.map((column) => (
                <div
                  {...column.getHeaderProps()}
                  className={"th " + column.render("Header").replace(/\s/g, "")}
                >
                  {column.render("Header")}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div {...getTableBodyProps()}>
          <FixedSizeList
            height={500}
            itemCount={rows.length}
            itemSize={35}
            width={totalColumnsWidth + scrollBarSize}
            overscanCount={25}
            onItemsRendered={onItemsRendered}
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
