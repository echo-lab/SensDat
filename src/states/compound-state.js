import { uid } from "../utils";

const INDEX = "Order";

/*
NOTE:
  - nodes are represented by strings like 'TF', or 'FF'.
  - edges are represented by strings like 'TTTF' to mean 'TT' -> 'TF'
*/

export class CompoundState {
  static typeName = "CompoundState";  // surely there's a better way?

  constructor(state1, state2, nodes, edges, name) {
    this.states = [state1, state2];
    this.nodes = nodes;
    this.edges = edges;
    this.name = name || "";
    this.id = uid();
  }

  withName(name) {
    let res = new CompoundState(...this.states, this.nodes, this.edges);
    res.name = name;
    return res;
  }

  toggleNode(node) {
    let nodes = this.nodes.includes(node) ? this.nodes.filter(x=>x!==node) : [...this.nodes, node];
    return new CompoundState(...this.states, nodes, this.edges);
  }

  toggleEdge(edge) {
    let edges = this.edges.includes(edge) ? this.edges.filter(x=>x!==edge) : [...this.edges, edge];
    return new CompoundState(...this.states, this.nodes, edges);
  }

  getValues(rows) {
    let truePoints = getChosenPoints(rows, this.states, this.nodes, this.edges);
    return rows.map(row => {
      return "" + truePoints.some(([lo, hi]) => lo <= row[INDEX] && row[INDEX] <= hi);
    });
  }

  // Helper functions for CompoundStatePane
  getPossibleNodesAndEdges(dataTable) {
    let [existingNodes, existingEdges] = [[], []];
    let summary = summarizeByStates(dataTable.rows, this.states);

    summary.forEach(({state, range}, i)=>{
      if (!existingNodes.includes(state)) existingNodes.push(state);

      if (i+1 === summary.length) return;

      let edge = `${state}${summary[i+1].state}`;
      if (!existingEdges.includes(edge)) existingEdges.push(edge);
    });
    return [existingNodes, existingEdges];
  }

  getChosenPoints(dataTable) {
    return getChosenPoints(dataTable.rows, this.states, this.nodes, this.edges);
  }

  // Helper functions for serialization/deserialization
  asObject() {
    return {
      type: CompoundState.typeName,
      states: this.states,
      name: this.name,
      nodes: this.nodes,
      edges: this.edges,
      id: this.id,
    };
  }

  static fromObject(o) {
    if (o.type !== CompoundState.typeName) return false;

    let res = new CompoundState(...o.states, o.nodes, o.edges, o.name);
    res.id = o.id;
    return res;
  }
}

const stateToString = (s1, s2) => `${s1 === "true" ? "T" : "F"}${s2 === "true" ? "T" : "F"}`;

function summarizeByStates(rows, [s1, s2]) {
  let res = [];  // e.g., [{state: 'TF', range: [1, 10]}, {state: 'TT', range: 11, 15}, ...]
  for (let row of rows) {
    let state = stateToString(row[s1.id], row[s2.id]);
    if (res.length === 0 || res.at(-1).state !== state) {
      let range = [row[INDEX], row[INDEX]];
      res.push({state, range});
    } else {
      res.at(-1).range[1] = row[INDEX];  // extend the range
    }
  }
  return res;
}

function getChosenPoints(rows, states, selectedNodes, selectedEdges) {
  let forward = {'TT': [], 'TF': [], 'FF': [], 'FT': []};
  let backward = {'TT': [], 'TF': [], 'FF': [], 'FT': []};
  selectedEdges.forEach(edge=>{
    let [u, v] = [edge.slice(0, 2), edge.slice(2, 4)];
    forward[u].push(v);
    backward[v].push(u);
  });

  let sumTable = summarizeByStates(rows, states);
  let res = [];

  sumTable.forEach(({state, range}, i) => {
    let node = state;

    if (!selectedNodes.includes(node)) return;

    let prevNode = i > 0 ? sumTable[i-1].state : null;
    let nextNode = i+1 < sumTable.length ? sumTable[i+1].state : null;

    if (forward[node].length > 0 && !forward[node].includes(nextNode)) return;
    if (backward[node].length > 0 && !backward[node].includes(prevNode)) return;

    res.push(range);
  });

  return res;
}
