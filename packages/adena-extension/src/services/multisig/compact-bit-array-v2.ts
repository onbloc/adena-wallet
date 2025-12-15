/**
 * CompactBitArray - Space efficient bit array
 */
class CompactBitArray {
  extraBitsStored: number;
  elems: Uint8Array;

  constructor(bits: number) {
    if (bits <= 0) {
      throw new Error('bits must be positive');
    }
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

  numTrueBitsBefore(index: number): number {
    let count = 0;
    for (let i = 0; i < index; i++) {
      if (this.getIndex(i)) {
        count++;
      }
    }
    return count;
  }

  toJSON(): any {
    return {
      extra_bits: this.extraBitsStored,
      bits: Array.from(this.elems),
    };
  }
}
