// UTF-8 TextDecoder fallback for engines that ship TextEncoder without TextDecoder.
// Follows the WHATWG UTF-8 decoder: malformed or truncated sequences become U+FFFD,
// or throw when `fatal` is set, so native builds accept exactly what web/Jest accept.
export class Utf8TextDecoder {
  readonly encoding = 'utf-8';
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;

  constructor(label = 'utf-8', options: { fatal?: boolean; ignoreBOM?: boolean } = {}) {
    if (!['utf-8', 'utf8', 'unicode-1-1-utf-8'].includes(label.trim().toLowerCase())) {
      throw new RangeError(`The "${label}" encoding is not supported`);
    }

    this.fatal = Boolean(options.fatal);
    this.ignoreBOM = Boolean(options.ignoreBOM);
  }

  decode(input?: ArrayBuffer | ArrayBufferView): string {
    if (!input) {
      return '';
    }

    const bytes = input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    const codePoints: number[] = [];
    let codePoint = 0;
    let bytesSeen = 0;
    let bytesNeeded = 0;
    let lower = 0x80;
    let upper = 0xbf;

    const fail = (): void => {
      if (this.fatal) {
        throw new TypeError('The encoded data was not valid utf-8');
      }

      codePoints.push(0xfffd);
    };

    for (let index = 0; index < bytes.length; index++) {
      const byte = bytes[index];

      if (bytesNeeded === 0) {
        if (byte <= 0x7f) {
          codePoints.push(byte);
        }
        else if (byte >= 0xc2 && byte <= 0xdf) {
          bytesNeeded = 1;
          codePoint = byte & 0x1f;
        }
        else if (byte >= 0xe0 && byte <= 0xef) {
          lower = byte === 0xe0 ? 0xa0 : 0x80;
          upper = byte === 0xed ? 0x9f : 0xbf;
          bytesNeeded = 2;
          codePoint = byte & 0x0f;
        }
        else if (byte >= 0xf0 && byte <= 0xf4) {
          lower = byte === 0xf0 ? 0x90 : 0x80;
          upper = byte === 0xf4 ? 0x8f : 0xbf;
          bytesNeeded = 3;
          codePoint = byte & 0x07;
        }
        else {
          fail();
        }

        continue;
      }

      if (byte < lower || byte > upper) {
        // The offending byte starts over as a new sequence.
        codePoint = 0;
        bytesNeeded = 0;
        bytesSeen = 0;
        lower = 0x80;
        upper = 0xbf;
        fail();
        index--;
        continue;
      }

      lower = 0x80;
      upper = 0xbf;
      codePoint = (codePoint << 6) | (byte & 0x3f);
      bytesSeen++;

      if (bytesSeen === bytesNeeded) {
        codePoints.push(codePoint);
        codePoint = 0;
        bytesNeeded = 0;
        bytesSeen = 0;
      }
    }

    if (bytesNeeded !== 0) {
      fail();
    }

    if (!this.ignoreBOM && codePoints[0] === 0xfeff) {
      codePoints.shift();
    }

    let result = '';

    for (let offset = 0; offset < codePoints.length; offset += 0x2000) {
      result += String.fromCodePoint(...codePoints.slice(offset, offset + 0x2000));
    }

    return result;
  }
}
