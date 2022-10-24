import { uid } from "../utils";

const INDEX = "Order";

/*
NOTE:
  - nodes are represented by strings like 'TF', or 'FF'.
  - Beginning/end nodes are strings 'AA' and 'ZZ' (LOL)
  - edges are represented by strings like 'TTTF' to mean 'TT' -> 'TF'
*/

export class CompoundState {
  static typeName = "CompoundState"; // surely there's a better way?

  constructor(
    state1,
    state2,
    possibleNodes,
    possibleEdges,
    nodes,
    edges,
    name
  ) {
    this.states = [state1, state2];
    this.possibleNodes = possibleNodes || [];
    this.possibleEdges = possibleEdges || [];
    this.nodes = nodes || [];
    this.edges = edges || [];
    this.name = name || "";
    this.id = uid();
  }

  copy() {
    return new CompoundState(
      ...this.states,
      this.possibleNodes,
      this.possibleEdges,
      this.nodes,
      this.edges,
      this.name
    );
  }

  withName(name) {
    let res = this.copy();
    res.name = name;
    return res;
  }

  toggleNode(node) {
    let res = this.copy();
    if (!this.nodes.includes(node)) {
      // Selecting a node: selects adjacent edges.
      res.nodes = [...this.nodes, node];
      res.edges = this.possibleEdges.filter(
        (edge) => this.edges.includes(edge) || asNodes(edge).includes(node)
      );
    } else {
      // Deselecting a node: deselects edges that no longer connect to selected nodes
      res.nodes = this.nodes.filter((x) => x !== node);
      res.edges = this.edges.filter((edge) =>
        asNodes(edge).some((node) => res.nodes.includes(node))
      );
    }
    return res;
  }

  toggleEdge(edge) {
    let res = this.copy();
    if (!this.edges.includes(edge)) {
      // Selecting an edge: does nothing if neither end-point is a selected node.
      if (!asNodes(edge).some((node) => this.nodes.includes(node))) return this;
      res.edges = [...this.edges, edge];
    } else {
      // Deselecting an edge: also deselects any nodes with no more edges.
      res.edges = this.edges.filter((x) => x !== edge);
      res.nodes = this.nodes.filter((node) =>
        res.edges.some((edge) => asNodes(edge).includes(node))
      );
    }
    return res;
  }

  getValues(rows) {
    let truePoints = getChosenPoints(rows, this.states, this.nodes, this.edges);
    return rows.map(
      (row) =>
        "" + truePoints.some(([lo, hi]) => lo <= row[INDEX] && row[INDEX] <= hi)
    );
  }

  // Helper functions for CompoundStatePane
  static getPossibleNodesAndEdges(dataTable, states) {
    let [possibleNodes, possibleEdges] = [[], []];
    let summary = summarizeByStates(dataTable.rows, states);

    summary.forEach(({ state, range }, i) => {
      if (!possibleNodes.includes(state)) possibleNodes.push(state);

      if (i + 1 === summary.length) return;

      let edge = `${state}${summary[i + 1].state}`;
      if (!possibleEdges.includes(edge)) possibleEdges.push(edge);
    });
    let [start, end] = [summary[0].state, summary.at(-1).state];
    possibleEdges.push(`AA${start}`);
    possibleEdges.push(`${end}ZZ`);
    return [possibleNodes, possibleEdges];
  }

  getChosenPoints(dataTable) {
    return getChosenPoints(dataTable.rows, this.states, this.nodes, this.edges);
  }

  // Helper functions for serialization/deserialization
  asObject() {
    return {
      type: CompoundState.typeName,
      states: this.states,
      possibleNodes: this.possibleNodes,
      possibleEdges: this.possibleEdges,
      name: this.name,
      nodes: this.nodes,
      edges: this.edges,
      id: this.id,
    };
  }

  static fromObject(o) {
    if (o.type !== CompoundState.typeName) return false;

    let res = new CompoundState(
      ...o.states,
      o.possibleNodes,
      o.possibleEdges,
      o.nodes,
      o.edges,
      o.name
    );
    res.id = o.id;
    return res;
  }
}

const stateToString = (s1, s2) =>
  `${s1 === "true" ? "T" : "F"}${s2 === "true" ? "T" : "F"}`;

function summarizeByStates(rows, [s1, s2]) {
  let res = []; // e.g., [{state: 'TF', range: [1, 10]}, {state: 'TT', range: 11, 15}, ...]
  for (let row of rows) {
    let state = stateToString(row[s1.id], row[s2.id]);
    if (res.length === 0 || res.at(-1).state !== state) {
      let range = [row[INDEX], row[INDEX]];
      res.push({ state, range });
    } else {
      res.at(-1).range[1] = row[INDEX]; // extend the range
    }
  }
  return res;
}

function getChosenPoints(rows, states, selectedNodes, selectedEdges) {
  let forward = { TT: [], TF: [], FF: [], FT: [], AA: [] };
  let backward = { TT: [], TF: [], FF: [], FT: [], ZZ: [] };
  selectedEdges.forEach((edge) => {
    let [u, v] = [edge.slice(0, 2), edge.slice(2, 4)];
    forward[u].push(v);
    backward[v].push(u);
  });

  let sumTable = summarizeByStates(rows, states);
  let res = [];

  sumTable.forEach(({ state, range }, i) => {
    let node = state;

    if (!selectedNodes.includes(node)) return;

    let prevNode = i > 0 ? sumTable[i - 1].state : "AA";
    let nextNode = i + 1 < sumTable.length ? sumTable[i + 1].state : "ZZ";

    if (!forward[node].includes(nextNode)) return;
    if (!backward[node].includes(prevNode)) return;

    res.push(range);
  });

  return res;
}

function asNodes(edge) {
  return [edge.substring(0, 2), edge.substring(2, 4)];
}
