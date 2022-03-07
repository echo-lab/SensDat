export class UIState {
  static Default = new UIState("default");
  static CreateRegion = new UIState("create-region");

  constructor(name) {
    this.name = name;
  }

  showViz() {
    return this === UIState.Default || this === UIState.CreateRegion;
  }
}
