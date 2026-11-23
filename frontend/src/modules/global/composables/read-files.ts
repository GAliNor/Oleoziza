import { i18n } from '~/plugins/i18n';

import { useToastStore } from 'global/stores/toast';
import { createId } from 'global/composables/crypto';
import { readPhoto } from 'global/composables/image';

const PDF = 'application/pdf';
const HEIC_NAME = /\.hei[cf]$/i;
/** The server refuses more than 10 MB; a photo the phone can't shrink is sent as it is, below that. */
const MAX_RAW_BYTES = 9 * 1024 * 1024;

/** A file that can't be read, or is too large to send as it is. */
export class FileUnreadableError extends Error {}

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => resolve(String(reader.result));
    reader.onerror = (): void => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const isPdfFile = (file: Pick<File, 'type' | 'name'>): boolean => file.type === PDF || /\.pdf$/i.test(file.name);

const isHeic = (file: Pick<File, 'type' | 'name'>): boolean => /^image\/hei[cf]/.test(file.type) || HEIC_NAME.test(file.name);

/** Some browsers give an iPhone photo no type: its name does. */
export const withType = (dataUrl: string, type: string): string => dataUrl.replace(/^data:[^;]*;/, `data:${type};`);

/** A photo made light on the device (1600 px JPEG); an iPhone one this browser can't open is sent as it is, and the server converts it. */
export const readLightPhoto = async (file: File): Promise<string> => {
  try {
    return await readPhoto(file);
  } catch {
    if (!isHeic(file) || file.size > MAX_RAW_BYTES) throw new FileUnreadableError(file.name);
    return withType(await readAsDataUrl(file), 'image/heic');
  }
};

export interface IReadFile {
  id: string;
  name: string;
  url: string;
  isPdf: boolean;
  addedBy: string;
  addedAt: string;
}

const readFile = async (file: File, addedBy: string): Promise<IReadFile> => {
  const isPdf = isPdfFile(file);
  if (isPdf && file.size > MAX_RAW_BYTES) throw new FileUnreadableError(file.name);
  return { id: createId(), name: file.name, url: isPdf ? withType(await readAsDataUrl(file), PDF) : await readLightPhoto(file), isPdf, addedBy, addedAt: new Date().toISOString() };
};

/** Turns picked or dropped files into documents, every photo light, PDFs as they are; one that can't be read is named in a toast and left out. */
export const readFiles = async (files: readonly File[], addedBy: string): Promise<IReadFile[]> => {
  const results = await Promise.allSettled(files.map((file) => readFile(file, addedBy)));
  results.forEach((result, index) => {
    if (result.status === 'rejected') useToastStore().push(i18n.global.t('global.photo.unreadable', { name: files[index].name }), 'danger');
  });
  return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
};
