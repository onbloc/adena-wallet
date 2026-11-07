/* eslint-disable no-bitwise -- UTF-8 decoding is bit manipulation by definition. */
/**
 * Hermes (React Native 0.77) ships TextEncoder but no TextDecoder. Vault and
 * session decryption decode UTF-8 with `new TextDecoder()`, so without this
 * every unlock failed as if the password were wrong.
 *
 * UTF-8 only, following the WHATWG decoder: invalid or truncated sequences
 * become U+FFFD, or throw when `fatal` is set.
 */
const REPLACEMENT = 0xfffd;

export class Utf8TextDecoder {
  readonly encoding = 'utf-8';

  readonly fatal: boolean;

  readonly ignoreBOM: boolean;

  constructor(
    label = 'utf-8',
    options: {fatal?: boolean; ignoreBOM?: boolean} = {},
  ) {
    if (!/^(utf-?8|unicode-1-1-utf-8)$/i.test(label.trim())) {
      throw new RangeError(`TextDecoder: unsupported encoding "${label}"`);
    }
    this.fatal = options.fatal === true;
    this.ignoreBOM = options.ignoreBOM === true;
  }

  decode(input?: ArrayBuffer | ArrayBufferView): string {
    const bytes = toBytes(input);
    const codePoints: number[] = [];
    let i = 0;
    if (
      !this.ignoreBOM &&
      bytes[0] === 0xef &&
      bytes[1] === 0xbb &&
      bytes[2] === 0xbf
    ) {
      i = 3;
    }

    while (i < bytes.length) {
      const first = bytes[i];
      if (first < 0x80) {
        codePoints.push(first);
        i += 1;
        continue;
      }

      let needed = 0;
      let lower = 0x80;
      let upper = 0xbf;
      let codePoint = 0;
      if (first >= 0xc2 && first <= 0xdf) {
        needed = 1;
        codePoint = first & 0x1f;
      } else if (first >= 0xe0 && first <= 0xef) {
        needed = 2;
        codePoint = first & 0x0f;
        if (first === 0xe0) {
          lower = 0xa0;
        } else if (first === 0xed) {
          upper = 0x9f; // no UTF-16 surrogates
        }
      } else if (first >= 0xf0 && first <= 0xf4) {
        needed = 3;
        codePoint = first & 0x07;
        if (first === 0xf0) {
          lower = 0x90;
        } else if (first === 0xf4) {
          upper = 0x8f; // nothing above U+10FFFF
        }
      } else {
        codePoints.push(this.invalid());
        i += 1;
        continue;
      }

      let consumed = 1;
      let valid = true;
      for (let k = 0; k < needed; k++) {
        const next = bytes[i + consumed];
        const min = k === 0 ? lower : 0x80;
        const max = k === 0 ? upper : 0xbf;
        if (next === undefined || next < min || next > max) {
          valid = false;
          break;
        }
        codePoint = (codePoint << 6) | (next & 0x3f);
        consumed += 1;
      }

      if (!valid) {
        // Per WHATWG: emit one replacement and resume at the offending byte.
        codePoints.push(this.invalid());
        i += consumed;
        continue;
      }
      codePoints.push(codePoint);
      i += consumed;
    }

    let result = '';
    for (let start = 0; start < codePoints.length; start += 4096) {
      result += String.fromCodePoint(...codePoints.slice(start, start + 4096));
    }
    return result;
  }

  private invalid(): number {
    if (this.fatal) {
      throw new TypeError('The encoded data was not valid UTF-8');
    }
    return REPLACEMENT;
  }
}

function toBytes(input?: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (input === undefined) {
    return new Uint8Array(0);
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
}

export function installTextDecoderPolyfill(): void {
  const globalObject = globalThis as {TextDecoder?: unknown};
  if (typeof globalObject.TextDecoder !== 'function') {
    globalObject.TextDecoder = Utf8TextDecoder;
  }
}
