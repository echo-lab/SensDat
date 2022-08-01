import { uid } from "../utils";

export class EllipseRegion {
  static typeName = "EllipseRegion";  // surely there's a better way?

  constructor(center, rx, ry, name="") {
    this.params = [center, rx, ry];
    this.name = name;
    this.id = uid();
  }

  get cx() { return this.params[0][0]; }
  get cy() { return this.params[0][1]; }
  get rx() { return this.params[1]; }
  get ry() { return this.params[2]; }

  withName(name) {
    return new EllipseRegion(...this.params, name);
  }

  _containsPoint(x, y) {
    let [[cx, cy], rx, ry] = this.params;
    return (x-cx)*(x-cx)/(rx*rx) + (y-cy)*(y-cy)/(ry*ry) <= 1;
  }

  getValues(rows) {
    return rows.map(row => String(this._containsPoint(row.Longitude, row.Latitude)));
  }

  asObject() {
    return {type: EllipseRegion.typeName, params: this.params, name: this.name, id: this.id};
  }

  static fromObject(o) {
    if (o.type !== EllipseRegion.typeName) return false;

    let res = new EllipseRegion(...o.params, o.name);
    res.id = o.id;
    return res;
  }
}
