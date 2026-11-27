// UTF-8 TextDecoder fallback for engines that ship TextEncoder without TextDecoder.
// Follows the WHATWG UTF-8 decoder: malformed or truncated sequences become U+FFFD,
// or throw when `fatal` is set, so native builds accept exactly what web/Jest accept.
// `decode(chunk, { stream: true })` keeps an incomplete trailing sequence for the next call.
export class Utf8TextDecoder {
  readonly encoding = 'utf-8';
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;

  // Decoder state carried between streaming calls.
  private codePoint = 0;
  private bytesSeen = 0;
  private bytesNeeded = 0;
  private lower = 0x80;
  private upper = 0xbf;
  private bomHandled = false;

  constructor(label = 'utf-8', options: { fatal?: boolean; ignoreBOM?: boolean } = {}) {
    if (!['utf-8', 'utf8', 'unicode-1-1-utf-8'].includes(label.trim().toLowerCase())) {
      throw new RangeError(`The "${label}" encoding is not supported`);
    }

    this.fatal = Boolean(options.fatal);
    this.ignoreBOM = Boolean(options.ignoreBOM);
  }

  decode(input?: ArrayBuffer | ArrayBufferView, options: { stream?: boolean } = {}): string {
    const bytes = !input
      ? new Uint8Array(0)
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    const codePoints: number[] = [];

    const resetSequence = (): void => {
      this.codePoint = 0;
      this.bytesNeeded = 0;
      this.bytesSeen = 0;
      this.lower = 0x80;
      this.upper = 0xbf;
    };
    const fail = (): void => {
      if (this.fatal) {
        resetSequence();
        throw new TypeError('The encoded data was not valid utf-8');
      }

      codePoints.push(0xfffd);
    };

    for (let index = 0; index < bytes.length; index++) {
      const byte = bytes[index];

      if (this.bytesNeeded === 0) {
        if (byte <= 0x7f) {
          codePoints.push(byte);
        }
        else if (byte >= 0xc2 && byte <= 0xdf) {
          this.bytesNeeded = 1;
          this.codePoint = byte & 0x1f;
        }
        else if (byte >= 0xe0 && byte <= 0xef) {
          this.lower = byte === 0xe0 ? 0xa0 : 0x80;
          this.upper = byte === 0xed ? 0x9f : 0xbf;
          this.bytesNeeded = 2;
          this.codePoint = byte & 0x0f;
        }
        else if (byte >= 0xf0 && byte <= 0xf4) {
          this.lower = byte === 0xf0 ? 0x90 : 0x80;
          this.upper = byte === 0xf4 ? 0x8f : 0xbf;
          this.bytesNeeded = 3;
          this.codePoint = byte & 0x07;
        }
        else {
          fail();
        }

        continue;
      }

      if (byte < this.lower || byte > this.upper) {
        // The offending byte starts over as a new sequence.
        resetSequence();
        fail();
        index--;
        continue;
      }

      this.lower = 0x80;
      this.upper = 0xbf;
      this.codePoint = (this.codePoint << 6) | (byte & 0x3f);
      this.bytesSeen++;

      if (this.bytesSeen === this.bytesNeeded) {
        codePoints.push(this.codePoint);
        resetSequence();
      }
    }

    if (!options.stream) {
      if (this.bytesNeeded !== 0) {
        resetSequence();
        fail();
      }
    }

    // The BOM is only stripped from the first decoded character of a stream.
    if (!this.bomHandled && codePoints.length > 0) {
      this.bomHandled = true;

      if (!this.ignoreBOM && codePoints[0] === 0xfeff) {
        codePoints.shift();
      }
    }

    if (!options.stream) {
      this.bomHandled = false;
    }

    let result = '';

    for (let offset = 0; offset < codePoints.length; offset += 0x2000) {
      result += String.fromCodePoint(...codePoints.slice(offset, offset + 0x2000));
    }

    return result;
  }
}
