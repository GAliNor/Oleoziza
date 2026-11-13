// imports
import { generate } from 'lean-qr';
import { toSvgPath } from 'lean-qr/extras/svg';

/** A QR code as one SVG path, drawn on a square of `size` modules. */
export interface IQrSvg {
  size: number;
  path: string;
}

/** Encodes a short text (a Lot code) as a QR code ready for an inline `<svg>`. */
export const renderQrSvg = (text: string): IQrSvg => {
  const code = generate(text);
  return { size: code.size, path: toSvgPath(code) };
};
