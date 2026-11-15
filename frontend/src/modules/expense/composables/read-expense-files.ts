import { createId } from 'global/composables/crypto';
import { readPhoto } from 'global/composables/image';
import type { IExpenseDocument } from 'expense/types/expense';

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => resolve(String(reader.result));
    reader.onerror = (): void => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Turns picked or dropped files into documents: photos shrunk like every photo of the app, PDFs as they are. Stays on the device until the backend stores them. */
export const readExpenseFiles = (files: readonly File[], addedBy: string): Promise<IExpenseDocument[]> =>
  Promise.all(
    files.map(async (file) => {
      const isPdf = file.type === 'application/pdf';
      return { id: createId(), name: file.name, url: isPdf ? await readAsDataUrl(file) : await readPhoto(file), isPdf, addedBy, addedAt: new Date().toISOString() };
    }),
  );
