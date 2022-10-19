import { rotate, uid } from "../utils";

export class RectRegion {
  static typeName = "RectRegion";

  constructor({ center, width, height, angle }, name) {
    this.params = { center, width, height, angle };
    this.name = name;
    this.id = uid();
  }

  withName(name) {
    return new EllipseRegion(this.params, name);
  }

  #containsPoint(x, y) {
    let {
      center: [cx, cy],
      width,
      height,
      angle,
    } = this.params;
    let p = rotate([x, y], -angle, [cx, cy]);
    let A = [cx - width / 2, cy - height / 2];
    let B = [cx + width / 2, cy - height / 2];
    let D = [cx - width / 2, cy + height / 2];

    let Ap = sub(p, A);
    let AB = sub(B, A);
    let AD = sub(D, A);

    return (
      0 <= dot(Ap, AB) &&
      dot(Ap, AB) < dot(AB, AB) &&
      0 <= dot(Ap, AD) &&
      dot(Ap, AD) < dot(AD, AD)
    );
  }

  getValues(rows, transform) {
    return rows.map((row) =>
      String(
        this.#containsPoint(
          ...transform.transformPoint([row.Longitude, row.Latitude])
        )
      )
    );
  }

  asObject() {
    return {
      type: RectRegion.typeName,
      params: { ...this.params },
      name: this.name,
      id: this.id,
    };
  }

  static fromObject(o) {
    if (o.type !== RectRegion.typeName) return false;

    let res = new RectRegion(o.params, o.name);
    res.id = o.id;
    return res;
  }
}

export class EllipseRegion {
  static typeName = "EllipseRegion"; // surely there's a better way?

  constructor(center, rx, ry, angle, name = "") {
    this.params = [center, rx, ry, angle];
    this.name = name;
    this.id = uid();
  }

  get cx() {
    return this.params[0][0];
  }
  get cy() {
    return this.params[0][1];
  }
  get rx() {
    return this.params[1];
  }
  get ry() {
    return this.params[2];
  }
  get angle() {
    return this.params[3];
  }

  withName(name) {
    return new EllipseRegion(...this.params, name);
  }

  #containsPoint(x, y) {
    let [[cx, cy], rx, ry, angle] = this.params;
    [x, y] = rotate([x, y], -angle, [cx, cy]);
    return (
      ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry) <= 1
    );
  }

  getValues(rows, transform) {
    return rows.map((row) =>
      String(
        this.#containsPoint(
          ...transform.transformPoint([row.Longitude, row.Latitude])
        )
      )
    );
  }

  asObject() {
    return {
      type: EllipseRegion.typeName,
      params: this.params,
      name: this.name,
      id: this.id,
    };
  }

  static fromObject(o) {
    if (o.type !== EllipseRegion.typeName) return false;

    let res = new EllipseRegion(...o.params, o.name);
    res.id = o.id;
    return res;
  }
}

function sub([x1, y1], [x2, y2]) {
  return [x1 - x2, y1 - y2];
}

function dot([x1, y1], [x2, y2]) {
  return x1 * x2 + y1 * y2;
}
