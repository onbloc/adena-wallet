/**
 * CompactBitArray implementation matching Go's bitarray.CompactBitArray
 *
 * This is used to track which signers have provided signatures in a multisig transaction.
 * Each bit represents whether a signer at that index has signed.
 */
export class CompactBitArray {
  public extraBitsStored: number; // bits % 8
  public elems: Uint8Array;

  constructor(bits: number) {
    this.extraBitsStored = bits % 8;
    this.elems = new Uint8Array(Math.ceil(bits / 8));
  }

  size(): number {
    if (this.extraBitsStored === 0) {
      return this.elems.length * 8;
    }
    return (this.elems.length - 1) * 8 + this.extraBitsStored;
  }

  getIndex(i: number): boolean {
    if (i >= this.size()) {
      return false;
    }
    // Big-endian bit order: 7 - (i % 8)
    return (this.elems[i >> 3] & (1 << (7 - (i % 8)))) > 0;
  }

  setIndex(i: number, v: boolean): boolean {
    if (i >= this.size()) {
      return false;
    }
    if (v) {
      this.elems[i >> 3] |= 1 << (7 - (i % 8));
    } else {
      this.elems[i >> 3] &= ~(1 << (7 - (i % 8)));
    }
    return true;
  }

  /**
   * NumTrueBitsBefore returns the number of bits set to true before the given index
   * This matches Go's implementation exactly
   *
   * Example: If bits are [1, 1, 0, 1, 0], numTrueBitsBefore(3) returns 2
   */
  numTrueBitsBefore(index: number): number {
    let numTrueValues = 0;
    for (let i = 0; i < index; i++) {
      if (this.getIndex(i)) {
        numTrueValues++;
      }
    }
    return numTrueValues;
  }

  /**
   * Encode to Amino format
   */
  toAmino(): { extra_bits: number; bits: Uint8Array } {
    return {
      extra_bits: this.extraBitsStored,
      bits: this.elems,
    };
  }
}
