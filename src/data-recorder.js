import exportFromJSON from "export-from-json";
import { latLongDist, stringTime } from "./utils";

export class DataRecorder {
  #points;

  constructor() {
    this.#points = [];
  }

  reset() {
    this.#points = [];
  }

  addPoint(pt) {
    this.#points.push(pt);
  }

  // Order,Latitude,Longitude,Elevation,Date Created,Distance from Start,Distance from Last,Bearing,Speed

  // Start time is the start time as a DateTime object.
  // dt is the total time in seconds between data points.
  exportPoints(startTime, dt) {
    console.log("POINTS: ", this.#points);

    let fileName = "simulated_data";
    let exportType = "csv";

    let totalDistance = 0;
    let data = this.#points.map(([long1, lat1], i) => {
      let t = new Date(startTime.getTime() + i * dt * 1000);
      let [long0, lat0] = i > 0 ? this.#points[i - 1] : this.#points[i];
      let meters = latLongDist(lat0, long0, lat1, long1);
      totalDistance += meters;

      return {
        Order: i + 1,
        Latitude: round(lat1, 7),
        Longitude: round(long1, 7),
        "Date Created": stringTime(t),
        "Distance from Last": Math.round(meters * 10) / 1e4,
        "Distance from Start": Math.round(totalDistance * 10) / 1e4,
        Speed: round(meters / 1e3 / (dt / 3600), 2),
      };
    });

    exportFromJSON({data, fileName, exportType});
  }
}

function round(n, k) {
  return Math.round(n*Math.pow(10, k)) / Math.pow(10, k);
}