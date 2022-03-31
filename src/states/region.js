export class EllipseRegion {

  constructor(center, rx, ry) {
    this.params = [center, rx, ry];
  }

  containsPoint(x, y) {
    let [[cx, cy], rx, ry] = this.params;
    return (x-cx)*(x-cx)/(rx*rx) + (y-cy)*(y-cy)/(ry*ry) <= 1;
  }

  getRowToValueFxn() {
    return row => String(this.containsPoint(row.Longitude, row.Latitude));
  }
}
