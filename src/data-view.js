import React, { useCallback } from "react";
import styled from "styled-components";
import { useTable, useBlockLayout } from "react-table";
import { FixedSizeList } from "react-window";
import Tab from "react-bootstrap/Tab";
import Tabs from 'react-bootstrap/Tabs';


export function DataView({dataTable, summaryTables, uistate}) {
  return (
    <div className="data-container debug def-visible">
      <Tabs defaultActiveKey="main" className="m-3">
        <Tab eventKey="main" title="Main Table">
          <Table dataTable={dataTable} />
        </Tab>
        {
          summaryTables.map(st=>
            <Tab eventKey={st.state.id} key={st.state.id} title={`Summary: ${st.state.name}`}>
              <div> TEMPORARY FILL! </div>
            </Tab>
          )
        }
      </Tabs>
    </div>
  );
}

// This is pretty much copied from this example:
// https://react-table.tanstack.com/docs/examples/virtualized-rows
function Table({ dataTable }) {
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
      return (
        <div
          {...row.getRowProps({
            style,
          })}
          className="tr"
        >
          {row.cells.map((cell) => {
            return (
              <div {...cell.getCellProps()} className="td">
                {cell.render("Cell")}
              </div>
            );
          })}
        </div>
      );
    },
    [prepareRow, rows]
  );

  return (
      <Styles>
        <div {...getTableProps()} className="table">
          <div>
            {headerGroups.map((headerGroup) => (
              <div {...headerGroup.getHeaderGroupProps()} className="tr">
                {headerGroup.headers.map((column) => (
                  <div {...column.getHeaderProps()} className="th">
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
            >
              {RenderRow}
            </FixedSizeList>
          </div>
        </div>
      </Styles>
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

const Styles = styled.div`
  padding: 1rem;

  .table {
    display: inline-block;
    border-spacing: 0;
    border: 1px solid black;
    width: auto;

    .tr {
      :last-child {
        .td {
          border-bottom: 0;
        }
      }
    }

    .th,
    .td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;

      :last-child {
        border-right: 1px solid black;
      }
    }
  }
`;
