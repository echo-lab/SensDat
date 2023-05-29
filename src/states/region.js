// Import Statements
import { rotate, uid } from "../utils";

// This class represents a Rectangular Region State that is created when a user
// creates a new Region State.
export class RectRegion {

  // The type of region being created.
  static typeName = "RectRegion";

  // Constructor that takes in the center point, width and height of the 
  // Rectangle, the angle that the Rectangle is rotated at, and the name of
  // the Rectangle Region.
  constructor({ center, width, height, angle }, name) {
    this.params = { center, width, height, angle };
    this.name = name;
    this.id = uid();
  }

  // Is this supposed to create a Rect Region????
  withName(name) {
    return new EllipseRegion(this.params, name);
  }

  // Method that calculates all of the points that the region contains.
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

  // This method gets all the boolean values that represent whether each point
  // in the data table is in the Region State or not.
  getValues(rows, transform) {
    return rows.map((row) =>
      String(
        this.#containsPoint(
          ...transform.transformPoint([row.Longitude, row.Latitude])
        )
      )
    );
  }
  
  // Returns the Rectangle Region as an Object?
  asObject() {
    return {
      type: RectRegion.typeName,
      params: { ...this.params },
      name: this.name,
      id: this.id,
    };
  }

  // Creates the Rectangle Region from an object that is passed in.
  static fromObject(o) {
    if (o.type !== RectRegion.typeName) return false;

    let res = new RectRegion(o.params, o.name);
    res.id = o.id;
    return res;
  }
}

// This class represents a Circular Region State that is created when a user
// creates a new Region State.
export class EllipseRegion {

  // The type of region being created.
  static typeName = "EllipseRegion"; // surely there's a better way?

 // Constructor that takes in the center point, rx and ry of the 
  // Ellipse, the angle that the Ellipse is rotated at, and the name of
  // the Ellipse Region.
  constructor( center, rx, ry, angle , name) {
    this.params = [center, rx, ry, angle];
    this.name = name;
    this.id = uid();
  }

  // Returns the center's x coordinate?
  get cx() {
    return this.params[0][0];
  }

  // Returns the center's y coordinate?
  get cy() {
    return this.params[0][1];
  }

  // Returns the rx coordinate?
  get rx() {
    return this.params[1];
  }

  // Returns the ry coordinate?
  get ry() {
    return this.params[2];
  }

  // Returns the angle of rotation.
  get angle() {
    return this.params[3];
  }

  withName(name) {
    return new EllipseRegion(...this.params, name);
  }

  // Method that calculates all of the points that the region contains.
  #containsPoint(x, y) {
    let [[cx, cy], rx, ry, angle] = this.params;
    [x, y] = rotate([x, y], -angle, [cx, cy]);
    return (
      ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry) <= 1
    );
  }

  // This method gets all the boolean values that represent whether each point
  // in the data table is in the Region State or not.
  getValues(rows, transform) {
    return rows.map((row) =>
      String(
        this.#containsPoint(
          ...transform.transformPoint([row.Longitude, row.Latitude])
        )
      )
    );
  }

  // Returns the Ellipse Region as an Object?
  asObject() {
    return {
      type: EllipseRegion.typeName,
      params: this.params,
      name: this.name,
      id: this.id,
    };
  }

  // Creates the Ellipse Region from an object that is passed in.
  static fromObject(o) {
    if (o.type !== EllipseRegion.typeName) return false;

    let res = new EllipseRegion(...o.params, o.name);
    res.id = o.id;
    return res;
  }
}

// Helper methods for the containsPoints methods.
function sub([x1, y1], [x2, y2]) {
  return [x1 - x2, y1 - y2];
}

function dot([x1, y1], [x2, y2]) {
  return x1 * x2 + y1 * y2;
}
