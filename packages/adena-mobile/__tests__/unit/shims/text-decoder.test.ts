import { Utf8TextDecoder } from '../../../src/shims/text-decoder';

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('Utf8TextDecoder', () => {
  const decoder = new Utf8TextDecoder();

  it('reports utf-8', () => {
    expect(decoder.encoding).toBe('utf-8');
  });

  it('returns an empty string without input', () => {
    expect(decoder.decode()).toBe('');
    expect(decoder.decode(new Uint8Array())).toBe('');
  });

  it.each(['hello', 'café', '한글', '€', '🙂🚀', 'mixed a é 한 🙂'])('decodes %p', (text) => {
    expect(decoder.decode(encode(text))).toBe(text);
  });

  it('accepts ArrayBuffers and offset views', () => {
    const bytes = encode('xx한글yy');

    expect(decoder.decode(bytes.buffer as ArrayBuffer)).toBe('xx한글yy');
    expect(decoder.decode(new Uint8Array(bytes.buffer, 2, 6))).toBe('한글');
    expect(decoder.decode(new DataView(bytes.buffer, 0, 2))).toBe('xx');
  });

  it('replaces stray continuation bytes', () => {
    expect(decoder.decode(new Uint8Array([0x61, 0x80, 0xbf, 0x62]))).toBe('a\ufffd\ufffdb');
  });

  it('does not throw on truncated sequences', () => {
    expect(() => decoder.decode(new Uint8Array([0xe2, 0x82]))).not.toThrow();
  });

  it.todo('invalid lead bytes 0xF5-0xFF should decode to U+FFFD instead of throwing RangeError');
});
