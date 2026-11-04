// rules
/** Picks a value from a feature property by exact match, falling back to `default`. */
export interface IMatchRule<T> {
  byProperty: string;
  match: Record<string, T>;
  default: T;
}

/** Picks a value from a numeric feature property: `base` below the first threshold, then each step's value from its threshold up. */
export interface IStepRule<T> {
  byProperty: string;
  base: T;
  steps: Array<[threshold: number, value: T]>;
}

/** A constant, or a rule that reads it from each feature. */
export type StyleValue<T> = T | IMatchRule<T> | IStepRule<T>;

/** A CSS color string (`#rrggbb`, `rgb()`, `rgba()`). */
export type Color = string;

// symbols
export interface IFillSymbol {
  color: StyleValue<Color>;
  opacity?: StyleValue<number>;
  hover?: { color?: Color; opacity?: number };
}

export interface ILineSymbol {
  color: StyleValue<Color>;
  width: StyleValue<number>;
  opacity?: StyleValue<number>;
  /** Dash and gap lengths, in multiples of the line width. */
  dash?: number[];
  hover?: { color?: Color; width?: number; opacity?: number };
}

export interface ICircleSymbol {
  color: StyleValue<Color>;
  /** Radius in CSS pixels. */
  radius: StyleValue<number>;
  opacity?: StyleValue<number>;
  strokeColor?: StyleValue<Color>;
  strokeWidth?: StyleValue<number>;
  hover?: { color?: Color; radius?: number; opacity?: number; strokeColor?: Color; strokeWidth?: number };
}

export type SymbolAnchor =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface IIconSymbol {
  /** Image URL (PNG or SVG). The adapter loads and registers it. */
  image: StyleValue<string>;
  /** Scale factor of the image's natural size. */
  size?: StyleValue<number>;
  anchor?: SymbolAnchor;
  /** Degrees clockwise. */
  rotate?: StyleValue<number>;
  /** Draw even when it collides with other icons or labels. */
  allowOverlap?: boolean;
}

export interface ILabelSymbol {
  /** Feature property whose value is shown as text. */
  textProperty: string;
  /** Font size in CSS pixels. */
  size?: StyleValue<number>;
  color?: StyleValue<Color>;
  haloColor?: Color;
  haloWidth?: number;
  anchor?: SymbolAnchor;
  offset?: [x: number, y: number];
  allowOverlap?: boolean;
}

/** The ways one layer draws its features. Inside a layer they draw in this order: fill, line, circle, icon, label. */
export interface ISymbols {
  fill?: IFillSymbol;
  line?: ILineSymbol;
  circle?: ICircleSymbol;
  icon?: IIconSymbol;
  label?: ILabelSymbol;
}
