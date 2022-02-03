import React, { useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import { Range } from 'rc-slider';
import 'rc-slider/assets/index.css';


/*
 * Creates a visualization of the data.
 * 
 * Args:
 * - dataTable:
 *      A DataTable object. Might not need the entire thing...
 * - vizTimespan:
 *      A range [x, y] where 0 <= x <= y < = 100.
 * - onSliderChange:
 *      A callback function for when the timespan slider changes.
 */
export function VizView({ dataTable, vizTimespan, onSliderChange }) {
  const svgRef = useRef();

  // Function to update the SVG.
  useEffect(
    () => {
      let svg = d3.select(svgRef.current);
      if (dataTable) drawToSVG(svg, dataTable, vizTimespan);
      return () => {};
    },
    /*dependencies=*/ [dataTable, vizTimespan]
  );

  let rangeSliderProps = {
    allowCross: false,
    // TODO: investigate why settings this to dataTable.length - 1 doesn't work
    max: 100,
    defaultValue: [0, 100],
    draggableTrack: true,
    // onAfterChange: onSliderChange,
    onChange: onSliderChange,
    // Also see: trackStyle, railStyle, dotStyle, activeDotStyle
  };

  // TODO: Figure out what these should be and probably move them.
  const svgStyle = {
          height: 500,
          width: 800,
          marginRight: "0px",
          marginLeft: "0px",
          border: "solid 1px black",
  };
  const sliderDivStyle = {width: 400, margin: 50};

  return (
    <div className="viz-container debug">
      <svg
        ref={svgRef}
        style={svgStyle}
      >
      </svg>
      <div style={sliderDivStyle}>
        <p>Timespan</p>
        <Range {...rangeSliderProps} />
      </div>
    </div>
  );
}

function drawToSVG(svg, dataTable, timespan) {
  let data = dataTable.data();

  const totalHeight = 500;
  const totalWidth = 800;
  const margin = { top: 30, right: 30, bottom: 30, left: 50 };
  const width = totalWidth - margin.left - margin.right;
  const height = totalHeight - margin.top - margin.bottom;

  // Filter the data
  let [minOrder, maxOrder] = d3.extent(data, d => d.Order);
  let [r1, r2] = timespan;
  let mno = minOrder + (r1/100)*(maxOrder-minOrder);
  let mxo = minOrder + (r2/100)*(maxOrder-minOrder);
  data = data.filter(row => row.Order >= mno && row.Order <= mxo );

  // Clear the SVG! Maybe there's a nicer way?
  svg.selectAll("*").remove();

  // Based on: https://www.d3-graph-gallery.com/graph/connectedscatter_basic.html
  svg = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.right})`);

  var x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.Longitude))
    .range([0, width]);

  var y = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.Latitude))
    .range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y));

  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#69b3a2")
    .attr("stroke-width", 1.5)
    .attr("d", d3.line()
      .x(d=>x(d.Longitude))
      .y(d=>y(d.Latitude))
    );

  svg.append("g")
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
      .attr("cx", d=>x(d.Longitude))
      .attr("cy", d=>y(d.Latitude))
      .attr("r", 3)
      .attr("fill", "#69b3a2");
}
