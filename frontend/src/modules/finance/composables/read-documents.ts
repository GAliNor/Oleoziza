import { createId } from 'global/composables/crypto';
import type { IPaymentDocument } from 'finance/types/finance';

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => resolve(String(reader.result));
    reader.onerror = (): void => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Turns picked files into documents. Stays on the device until there is a real store for them. */
export const readDocuments = (files: readonly File[], addedBy: string): Promise<IPaymentDocument[]> =>
  Promise.all(
    files.map(async (file) => ({ id: createId(), name: file.name, url: await readAsDataUrl(file), isPdf: file.type === 'application/pdf', addedBy, addedAt: new Date().toISOString() })),
  );
