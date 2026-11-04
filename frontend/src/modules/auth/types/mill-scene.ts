export interface IMillSceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IMillSceneLayer extends IMillSceneRect {
  src: string;
}

export interface IMillSceneCrown extends IMillSceneLayer {
  pivotX: number;
  pivotY: number;
  swaySeconds: number;
  swayDelaySeconds: number;
}

export interface IMillSceneLayout {
  canvas: { width: number; height: number };
  plate: IMillSceneLayer;
  crowns: IMillSceneCrown[];
  olive: IMillSceneLayer & { travelX: number; travelY: number };
  stone: IMillSceneLayer;
  basinFront: IMillSceneLayer;
  stream: { path: string; width: number };
  tank: IMillSceneRect & { radius: number; levelHeight: number };
}
