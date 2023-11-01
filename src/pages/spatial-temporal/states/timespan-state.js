import { COL_TYPES } from "../data-table";
import { uid } from "../utils";

// This creates a timepsan state.
// Note that it should probably use TIME, but we're cheating and using
// the ORDER :)
export class TimespanState {
  static typeName = "TimespanState";
  constructor(name, range) {
    this.id = uid();
    this.name = name;
    this.range = range;
  }

  getValues(table) {
    // This is slightly more general than using `row.Order`. But eh.
    const idxAccessor = table.getAccessor(COL_TYPES.INDEX);
    const index = (row) => row[idxAccessor];

    const [lo, hi] = this.range;
    return table.rows.map((row) =>
      String(lo <= index(row) && index(row) <= hi)
    );
  }

  asObject() {
    return {
      type: TimespanState.typeName,
      name: this.name,
      range: this.range,
      id: this.id,
    };
  }

  static fromObject(o) {
    if (o.type !== TimespanState.typeName) return false;

    let res = new TimespanState(o.name, o.range);
    res.id = o.id;
    return res;
  }
}
