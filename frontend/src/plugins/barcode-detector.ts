// imports
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

// variables
const QR_FORMAT = 'qr_code';

/** What reads QR codes from camera frames: the browser's own BarcodeDetector, or the ZXing WASM ponyfill where it is missing (iPhone). */
export interface IQrDetector {
  detect(source: HTMLVideoElement): Promise<string[]>;
}

type FrameDetector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type NativeBarcodeDetector = { new (options: { formats: string[] }): FrameDetector; getSupportedFormats(): Promise<string[]> };

let detector: Promise<IQrDetector> | null = null;

// methods
const nativeDetector = (): NativeBarcodeDetector | undefined => (globalThis as { BarcodeDetector?: NativeBarcodeDetector }).BarcodeDetector;

const hasNativeQr = async (): Promise<boolean> => {
  try {
    return !!(await nativeDetector()?.getSupportedFormats())?.includes(QR_FORMAT);
  } catch {
    return false;
  }
};

const wrap = (instance: FrameDetector): IQrDetector => ({
  detect: async (source) => (await instance.detect(source)).map((code) => code.rawValue),
});

const loadDetector = async (): Promise<IQrDetector> => {
  const Native = nativeDetector();
  if (Native && (await hasNativeQr())) return wrap(new Native({ formats: [QR_FORMAT] }));
  const ponyfill = await import('barcode-detector/ponyfill');
  ponyfill.prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) } });
  return wrap(new ponyfill.BarcodeDetector({ formats: [QR_FORMAT] }));
};

/** The QR detector, created once; the WASM fallback is served by the app, never from a CDN. */
export const getQrDetector = (): Promise<IQrDetector> => {
  detector ??= loadDetector().catch((error: unknown) => {
    detector = null;
    throw error;
  });
  return detector;
};
