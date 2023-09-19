export class UIState {
  static NotLoaded = new UIState("not-loaded");
  static Default = new UIState("default");
  static CreateRegion = new UIState("create-region");
  static CreateCondition = new UIState("create-condition");
  static CreateCompound = new UIState("create-compound");
  static CreateSequence = new UIState("create-sequence");
  static MoveDataPoints = new UIState("move-data-points");
  static UploadLayout = new UIState("upload-layout");

  constructor(name) {
    this.name = name;
  }

  // Should we show the data points on the viz view? Answer should be no if the table isn't showing.
  shouldShowPoints() {
    return ![UIState.CreateCompound, UIState.CreateSequence, UIState.CreateCondition].includes(this);
  }

  // i.e., are we currently doing some action that prevents us from starting another one?
  busy() {
    return this !== UIState.Default;
  }
}
