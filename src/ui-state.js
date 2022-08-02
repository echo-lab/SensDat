export class UIState {
  static NotLoaded = new UIState("not-loaded");
  static Default = new UIState("default");
  static CreateRegion = new UIState("create-region");
  static CreateCompound = new UIState("create-compound");

  constructor(name) {
    this.name = name;
  }

  statePaneDisabled() {
    return this === UIState.CreateCompound;
  }
}
