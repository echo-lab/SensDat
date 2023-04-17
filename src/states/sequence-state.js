import { groupByStates } from "../summary-table";
import { getSequenceInfo, uid } from "../utils";

export class SequenceState {
  static typeName = "SequenceState";

  // states is [stat_id, ...]
  // sequence is a sequence of lists of state IDs
  // name is a string
  constructor(states, sequence, name) {
    this.states = states;
    this.sequence = sequence;
    this.name = name;
    this.id = uid();
  }

  withName(name) {
    return new SequenceState(this.states, this.sequence, name);
  }

  // Tell DataTable what's true/false
  getValues(table) {
    // [{states: [...], range: [1, 243]}, ...]
    let statesToRows = groupByStates(
      table,
      this.states.map((id) => ({ id })) // ugh...
    );

    let seq = statesToRows.map((x) => JSON.stringify(x.states));
    let target = this.sequence.map(JSON.stringify);
    let seqInfo = getSequenceInfo(seq, target);
    // [{seqNum: -1}, {seqNum: 1}, {seqNum: 2}, {seqNum: -1}, ...]

    let goodRanges = statesToRows
      .filter((x, idx) => seqInfo[idx].seqNum >= 0)
      .map((s) => s.range);
    return table.rows.map((row) =>
      "" + goodRanges.some(([lo, hi]) => lo <= row["Order"] && row["Order"] <= hi)
    );
  }

  asObject() {
    return {
      type: SequenceState.typeName,
      sequence: this.sequence,
      states: this.states,
      name: this.name,
      id: this.id,
    };
  }

  static fromObject(o) {
    if (o.type !== SequenceState.typeName) return false;

    let res = new SequenceState(o.states, o.sequence, o.name);
    res.id = o.id;
    return res;
  }
}
