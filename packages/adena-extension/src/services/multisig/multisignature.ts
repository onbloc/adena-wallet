import { CompactBitArray } from './compact-bit-array';

/**
 * Multisignature implementation matching Go's multisig.Multisignature
 *
 * This class combines multiple signatures from different signers into a single
 * multisig signature that can be verified against a multisig public key.
 */
export class Multisignature {
  public bitArray: CompactBitArray;
  public sigs: Uint8Array[];

  constructor(numSigners: number) {
    this.bitArray = new CompactBitArray(numSigners);
    this.sigs = [];
  }

  /**
   * AddSignature adds a signature at the given index
   * This matches Go's AddSignature implementation exactly
   *
   * @param sig - The signature bytes
   * @param index - The index of the signer in the multisig public key
   */
  addSignature(sig: Uint8Array, index: number): void {
    const newSigIndex = this.bitArray.numTrueBitsBefore(index);

    // Signature already exists, replace it
    if (this.bitArray.getIndex(index)) {
      this.sigs[newSigIndex] = sig;
      return;
    }

    // Set bit in BitArray
    this.bitArray.setIndex(index, true);

    // Optimization if the index is the greatest index
    if (newSigIndex === this.sigs.length) {
      this.sigs.push(sig);
      return;
    }

    // Insert signature at the correct position
    this.sigs.splice(newSigIndex, 0, sig);
  }

  /**
   * AddSignatureFromPubKey adds a signature at the index corresponding to the pubkey
   * This matches Go's AddSignatureFromPubKey implementation
   *
   * @param sig - The signature bytes
   * @param pubkey - The public key of the signer
   * @param keys - All public keys in the multisig (in order)
   */
  addSignatureFromPubKey(sig: Uint8Array, pubkey: Uint8Array, keys: Uint8Array[]): void {
    console.log(pubkey, keys, '? pubkey keys');
    const index = this.getIndex(pubkey, keys);
    console.log(index, 'index');
    if (index === -1) {
      throw new Error(
        `Provided key doesn't exist in pubkeys: ${Buffer.from(pubkey).toString('hex')}`,
      );
    }
    this.addSignature(sig, index);
  }

  /**
   * ✅ NEW: Add signature using address instead of pubkey
   *
   * @param sig - The signature bytes
   * @param signerAddress - The address of the signer (e.g., "g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5")
   * @param signerAddresses - All signer addresses in the multisig (in order)
   */
  addSignatureFromAddress(sig: Uint8Array, signerAddress: string, signerAddresses: string[]): void {
    const index = signerAddresses.indexOf(signerAddress);

    console.log('Looking for address:', signerAddress);
    console.log('Available addresses:', signerAddresses);
    console.log('Found index:', index);

    if (index === -1) {
      throw new Error(`Provided address doesn't exist in signers: ${signerAddress}`);
    }

    this.addSignature(sig, index);
  }

  /**
   * Get index of pubkey in keys array
   */
  private getIndex(pubkey: Uint8Array, keys: Uint8Array[]): number {
    for (let i = 0; i < keys.length; i++) {
      if (this.areEqual(pubkey, keys[i])) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Compare two Uint8Arrays
   */
  private areEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * Marshal to Amino format using Protobuf encoding
   * This matches Go's amino.MustMarshal(mSig)
   */
  marshal(): Uint8Array {
    const amino = this.toAmino();

    // Encode bit array
    const bitArrayBytes = this.encodeBitArray(amino.bit_array);

    // Encode signatures
    const sigsBytes = this.encodeSignatures(amino.sigs);

    // Combine
    return new Uint8Array([...bitArrayBytes, ...sigsBytes]);
  }

  private toAmino(): { bit_array: { extra_bits: number; bits: Uint8Array }; sigs: Uint8Array[] } {
    return {
      bit_array: this.bitArray.toAmino(),
      sigs: this.sigs,
    };
  }

  private encodeBitArray(bitArray: { extra_bits: number; bits: Uint8Array }): Uint8Array {
    // Amino field 1: extra_bits (varint)
    const field1 = new Uint8Array([
      0x08, // field 1, wire type 0 (varint)
      bitArray.extra_bits,
    ]);

    // Amino field 2: bits (bytes)
    const bitsLength = this.encodeVarint(bitArray.bits.length);
    const field2 = new Uint8Array([
      0x12, // field 2, wire type 2 (length-delimited)
      ...bitsLength,
      ...bitArray.bits,
    ]);

    return new Uint8Array([...field1, ...field2]);
  }

  private encodeSignatures(signatures: Uint8Array[]): Uint8Array {
    const result: number[] = [];

    for (const signature of signatures) {
      // Amino field 3: sigs (repeated bytes)
      result.push(0x1a); // field 3, wire type 2 (length-delimited)
      const signatureLength = this.encodeVarint(signature.length);
      result.push(...signatureLength);
      result.push(...signature);
    }

    return new Uint8Array(result);
  }

  private encodeVarint(value: number): number[] {
    const bytes: number[] = [];
    while (value > 127) {
      bytes.push((value & 127) | 128);
      value >>= 7;
    }
    bytes.push(value);
    return bytes;
  }
}
