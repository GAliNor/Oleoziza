const PBKDF2_ITERATIONS = 150_000;

const toBase64 = (bytes: ArrayBuffer | Uint8Array): string =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)));

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

export const createSalt = (): string => toBase64(crypto.getRandomValues(new Uint8Array(16)));

export const hashPin = async (pin: string, salt: string): Promise<string> => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return toBase64(bits);
};

export const verifyPin = async (pin: string, salt: string, pinHash: string): Promise<boolean> =>
  (await hashPin(pin, salt)) === pinHash;
