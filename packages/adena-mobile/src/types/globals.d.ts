// Web globals provided by Hermes (TextEncoder, crypto) or by src/app/polyfills.ts
// (TextDecoder fallback, crypto.getRandomValues via react-native-get-random-values).
// Declared narrowly instead of pulling in @types/node, so app code cannot reach Node APIs.

declare class TextEncoder {
  readonly encoding: string;
  encode(input?: string): Uint8Array;
}

declare class TextDecoder {
  constructor(label?: string);
  readonly encoding: string;
  decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string;
}

interface AdenaWebCrypto {
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
}

// eslint-disable-next-line no-var
declare var crypto: AdenaWebCrypto;
