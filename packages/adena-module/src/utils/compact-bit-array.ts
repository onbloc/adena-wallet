import { CompactBitArray } from '@gnolang/tm2-js-client';

export function createCompactBitArray(bitCount: number): CompactBitArray {
  if (!Number.isInteger(bitCount) || bitCount < 0) {
    throw new Error('bitCount must be a non-negative integer');
  }

  return {
    extra_bits_stored: bitCount % 8,
    elems: new Uint8Array(Math.ceil(bitCount / 8)),
  };
}

export function compactBitArraySetIndex(
  bitArray: CompactBitArray,
  index: number,
  value: boolean,
): void {
  const totalBits = bitArray.elems.length * 8 - ((8 - bitArray.extra_bits_stored) % 8);
  if (!Number.isInteger(index) || index < 0 || index >= totalBits) {
    throw new Error(`bit index ${index} out of range`);
  }

  const byteIndex = Math.floor(index / 8);
  const bitIndex = 7 - (index % 8);
  const mask = 1 << bitIndex;
  if (value) {
    bitArray.elems[byteIndex] |= mask;
  } else {
    bitArray.elems[byteIndex] &= ~mask;
  }
}
