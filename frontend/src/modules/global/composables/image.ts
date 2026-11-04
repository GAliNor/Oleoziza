const PHOTO_MAX_SIDE = 1600;
const PHOTO_QUALITY = 0.82;

/** The size that fits inside a square of `maxSide`, keeping the proportions; a smaller image stays as it is. */
export const fitWithin = (width: number, height: number, maxSide: number): { width: number; height: number } => {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

/** A photo as a light JPEG data URL, upright: phone cameras take far more pixels than a timeline shows. Rejects what the browser cannot read. */
export const readPhoto = async (file: File): Promise<string> => {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_SIDE);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
};
