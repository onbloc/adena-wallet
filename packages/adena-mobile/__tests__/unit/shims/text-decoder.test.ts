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

describe('Utf8TextDecoder conformance', () => {
  // Node's decoder implements the WHATWG algorithm; the fallback must match it byte for byte.
  const { TextDecoder: Reference } = jest.requireActual<typeof import('util')>('util');
  const { Utf8TextDecoder: Fallback } = jest.requireActual<typeof import('../../../src/shims/text-decoder')>('../../../src/shims/text-decoder');

  const cases: [string, number[]][] = [
    ['ascii', [0x61, 0x62]],
    ['4-byte max', [0xf4, 0x8f, 0xbf, 0xbf]],
    ['lead 0xF8', [0xf8, 0x80, 0x80, 0x80]],
    ['lead 0xF5', [0xf5, 0x80, 0x80, 0x80]],
    ['lead 0xFF', [0xff]],
    ['truncated 3-byte', [0xe2, 0x82]],
    ['truncated then ascii', [0xe2, 0x82, 0x41]],
    ['overlong slash', [0xc0, 0xaf]],
    ['overlong 3-byte', [0xe0, 0x80, 0xaf]],
    ['surrogate', [0xed, 0xa0, 0x80]],
    ['above U+10FFFF', [0xf4, 0x90, 0x80, 0x80]],
    ['lone continuation', [0x80, 0xbf]],
    ['bom', [0xef, 0xbb, 0xbf, 0x61]],
  ];

  it.each(cases)('replaces malformed input like the standard decoder: %s', (_name, input) => {
    const bytes = Uint8Array.from(input);

    expect(new Fallback().decode(bytes)).toBe(new Reference().decode(bytes));
  });

  it.each(cases)('throws in fatal mode exactly when the standard decoder does: %s', (_name, input) => {
    const bytes = Uint8Array.from(input);
    const reference = (): string => new Reference('utf-8', { fatal: true }).decode(bytes);
    const fallback = (): string => new Fallback('utf-8', { fatal: true }).decode(bytes);
    let referenceThrew = false;

    try {
      reference();
    }
    catch {
      referenceThrew = true;
    }

    if (referenceThrew) {
      expect(fallback).toThrow(TypeError);
    }
    else {
      expect(fallback()).toBe(reference());
    }
  });

  it('keeps the BOM when ignoreBOM is set and rejects other encodings', () => {
    expect(new Fallback('utf-8', { ignoreBOM: true }).decode(Uint8Array.of(0xef, 0xbb, 0xbf))).toBe('﻿');
    expect(() => new Fallback('latin1')).toThrow(RangeError);
  });
});
