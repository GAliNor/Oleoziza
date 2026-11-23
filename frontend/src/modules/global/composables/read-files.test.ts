import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readPhoto } from 'global/composables/image';
import { FileUnreadableError, isPdfFile, readLightPhoto, withType } from 'global/composables/read-files';

vi.mock('global/composables/image', () => ({ readPhoto: vi.fn() }));

class FakeReader {
  result = '';
  onload: () => void = () => undefined;
  onerror: () => void = () => undefined;
  readAsDataURL(): void {
    this.result = 'data:application/octet-stream;base64,AAAA';
    this.onload();
  }
}

const file = (name: string, type: string, size = 1000): File => ({ name, type, size }) as File;

describe('reading a photo', () => {
  beforeEach(() => {
    vi.stubGlobal('FileReader', FakeReader);
    vi.mocked(readPhoto).mockReset();
  });

  it('sends the light version the device made', async () => {
    vi.mocked(readPhoto).mockResolvedValue('data:image/jpeg;base64,light');
    expect(await readLightPhoto(file('olives.jpg', 'image/jpeg'))).toBe('data:image/jpeg;base64,light');
  });

  it.each([
    ['IMG_0042.HEIC', ''],
    ['photo', 'image/heic'],
  ])('sends an iPhone photo this browser cannot open as it is (%s)', async (name, type) => {
    vi.mocked(readPhoto).mockRejectedValue(new Error('cannot decode'));
    expect(await readLightPhoto(file(name, type))).toBe('data:image/heic;base64,AAAA');
  });

  it('refuses what is not a photo, and an iPhone photo too large to send', async () => {
    vi.mocked(readPhoto).mockRejectedValue(new Error('cannot decode'));
    await expect(readLightPhoto(file('notes.txt', 'text/plain'))).rejects.toBeInstanceOf(FileUnreadableError);
    await expect(readLightPhoto(file('IMG.heic', 'image/heic', 20_000_000))).rejects.toBeInstanceOf(FileUnreadableError);
  });

  it('knows a PDF by its type or its name', () => {
    expect([isPdfFile(file('facture', 'application/pdf')), isPdfFile(file('Facture.PDF', '')), isPdfFile(file('a.jpg', 'image/jpeg'))]).toEqual([true, true, false]);
  });

  it('gives the data its real type', () => {
    expect(withType('data:;base64,AA', 'application/pdf')).toBe('data:application/pdf;base64,AA');
  });
});
