import {randomBytes} from 'crypto';

import {Utf8TextDecoder} from '../../src/platform/text-decoder-polyfill';

const NodeTextDecoder = require('util').TextDecoder;

describe('Utf8TextDecoder', () => {
  it('decodes text exactly like the platform decoder', () => {
    const samples = [
      '',
      'PASSWORD',
      '지갑 비밀번호',
      'emoji 🔐 and 𝄞',
      '{"msgs":[]}',
      '\u0000\u007f\u0080߿ࠀ￿',
    ];
    for (const text of samples) {
      const bytes = new TextEncoder().encode(text);
      expect(new Utf8TextDecoder().decode(bytes)).toBe(text);
    }
  });

  it('matches the WHATWG decoder on random and malformed bytes', () => {
    const reference = new NodeTextDecoder('utf-8');
    const ours = new Utf8TextDecoder();
    for (let i = 0; i < 2000; i++) {
      const bytes = new Uint8Array(randomBytes(1 + (i % 24)));
      expect(ours.decode(bytes)).toBe(reference.decode(bytes));
    }
    const edgeCases = [
      [0xc0, 0x80], // overlong
      [0xed, 0xa0, 0x80], // surrogate
      [0xf4, 0x90, 0x80, 0x80], // above U+10FFFF
      [0xe2, 0x82], // truncated
      [0xef, 0xbb, 0xbf, 0x41], // BOM
    ];
    for (const sequence of edgeCases) {
      const bytes = Uint8Array.from(sequence);
      expect(ours.decode(bytes)).toBe(reference.decode(bytes));
    }
  });

  it('decodes views into a larger buffer without reading outside them', () => {
    const backing = new TextEncoder().encode('xxSECRETyy');
    expect(new Utf8TextDecoder().decode(backing.subarray(2, 8))).toBe('SECRET');
  });

  it('throws on malformed input in fatal mode and rejects other encodings', () => {
    expect(() =>
      new Utf8TextDecoder('utf-8', {fatal: true}).decode(
        Uint8Array.from([0xff]),
      ),
    ).toThrow(TypeError);
    expect(() => new Utf8TextDecoder('latin1')).toThrow(RangeError);
  });
});
