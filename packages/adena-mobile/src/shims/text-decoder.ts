// UTF-8 only TextDecoder fallback for engines that ship TextEncoder without TextDecoder.
export class Utf8TextDecoder {
  readonly encoding = 'utf-8';

  decode(input?: ArrayBuffer | ArrayBufferView): string {
    if (!input) {
      return '';
    }

    const bytes = input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);

    let result = '';
    let index = 0;

    while (index < bytes.length) {
      const byte1 = bytes[index++];
      let codePoint: number;

      if (byte1 < 0x80) {
        codePoint = byte1;
      }
      else if (byte1 >= 0xc0 && byte1 < 0xe0) {
        codePoint = ((byte1 & 0x1f) << 6) | (bytes[index++] & 0x3f);
      }
      else if (byte1 >= 0xe0 && byte1 < 0xf0) {
        codePoint = ((byte1 & 0x0f) << 12) | ((bytes[index++] & 0x3f) << 6) | (bytes[index++] & 0x3f);
      }
      else if (byte1 >= 0xf0) {
        codePoint = ((byte1 & 0x07) << 18) | ((bytes[index++] & 0x3f) << 12)
          | ((bytes[index++] & 0x3f) << 6) | (bytes[index++] & 0x3f);
      }
      else {
        codePoint = 0xfffd;
      }

      result += String.fromCodePoint(codePoint);
    }

    return result;
  }
}
