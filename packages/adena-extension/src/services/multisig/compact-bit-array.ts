/**
 * CompactBitArray implementation matching Go's bitarray.CompactBitArray
 *
 * This is used to track which signers have provided signatures in a multisig transaction.
 * Each bit represents whether a signer at that index has signed.
 */
export class CompactBitArray {
  private numBits: number;
  private elems: Uint8Array;
  private extraBitsStored: number;

  constructor(numBits: number) {
    this.numBits = numBits;
    this.extraBitsStored = numBits % 8;

    const numBytes = Math.ceil(numBits / 8);
    this.elems = new Uint8Array(numBytes);
  }

  /**
   * Set bit at index (LSB first!)
   *
   * Example: For 3 signers, to set bit 1:
   * - index = 1
   * - byteIndex = 0
   * - bitIndex = 1
   * - Result: 0b00000010 = 0x02
   */
  setIndex(index: number, value: boolean): void {
    if (index < 0 || index >= this.numBits) {
      throw new Error(`Index ${index} out of bounds [0, ${this.numBits})`);
    }

    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;

    console.log(`🔧 CompactBitArray.setIndex(${index}, ${value}):`);
    console.log(`  byteIndex: ${byteIndex}, bitIndex: ${bitIndex}`);
    console.log(
      `  Before: elems[${byteIndex}] = 0x${this.elems[byteIndex].toString(16).padStart(2, '0')} = 0b${this.elems[byteIndex].toString(2).padStart(8, '0')}`,
    );

    if (value) {
      // Set bit (LSB = bit 0, so bit 1 = 0x02)
      this.elems[byteIndex] |= 1 << bitIndex;
    } else {
      // Clear bit
      this.elems[byteIndex] &= ~(1 << bitIndex);
    }

    console.log(
      `  After:  elems[${byteIndex}] = 0x${this.elems[byteIndex].toString(16).padStart(2, '0')} = 0b${this.elems[byteIndex].toString(2).padStart(8, '0')}`,
    );
  }

  /**
   * Get bit at index
   */
  getIndex(index: number): boolean {
    if (index < 0 || index >= this.numBits) {
      return false;
    }

    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;

    return (this.elems[byteIndex] & (1 << bitIndex)) !== 0;
  }

  /**
   * Count number of true bits before index
   */
  numTrueBitsBefore(index: number): number {
    let count = 0;
    for (let i = 0; i < index && i < this.numBits; i++) {
      if (this.getIndex(i)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Convert to Amino format
   */
  toAmino(): { extra_bits: number; bits: Uint8Array } {
    return {
      extra_bits: this.extraBitsStored,
      bits: this.elems,
    };
  }
}
