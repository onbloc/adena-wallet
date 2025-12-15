import { uint8ArrayToBase64 } from '@gnolang/tm2-js-client';
import { CompactBitArray } from './compact-bit-array';

export class Multisignature {
  public bitArray: CompactBitArray;
  public sigs: Uint8Array[];

  constructor(numSigners: number) {
    this.bitArray = new CompactBitArray(numSigners);
    this.sigs = [];
  }

  addSignature(sig: Uint8Array, index: number): void {
    console.log(`\n📝 addSignature(sig, ${index}):`);

    const newSigIndex = this.bitArray.numTrueBitsBefore(index);
    console.log(`  newSigIndex: ${newSigIndex}`);
    console.log(`  bitArray.getIndex(${index}): ${this.bitArray.getIndex(index)}`);

    if (this.bitArray.getIndex(index)) {
      console.log(`  Replacing existing signature at index ${index}`);
      this.sigs[newSigIndex] = sig;
      return;
    }

    console.log(`  Setting new bit at index ${index}`);
    this.bitArray.setIndex(index, true);

    if (newSigIndex === this.sigs.length) {
      console.log(`  Appending signature`);
      this.sigs.push(sig);
      return;
    }

    console.log(`  Inserting signature at position ${newSigIndex}`);
    this.sigs.splice(newSigIndex, 0, sig);
  }

  addSignatureFromPubKey(sig: Uint8Array, pubkey: Uint8Array, keys: Uint8Array[]): void {
    console.log('\n🔍 addSignatureFromPubKey:');
    console.log(`  Looking for pubkey: ${Buffer.from(pubkey).toString('hex')}`);
    console.log(`  Available keys:`);
    keys.forEach((key, i) => {
      console.log(`    [${i}] ${Buffer.from(key).toString('hex')}`);
    });

    const index = this.getIndex(pubkey, keys);
    console.log(`  Found index: ${index}`);

    if (index === -1) {
      throw new Error(
        `Provided key doesn't exist in pubkeys: ${Buffer.from(pubkey).toString('hex')}`,
      );
    }

    console.log(`  Setting bit at index ${index}`);
    this.addSignature(sig, index);

    // BitArray 상태 출력
    const amino = this.bitArray.toAmino();
    console.log(`  BitArray after adding signature:`);
    console.log(`    bits: 0x${Buffer.from(amino.bits).toString('hex')}`);
    console.log(`    binary: ${amino.bits[0]?.toString(2).padStart(8, '0')}`);
  }

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

  private getIndex(pubkey: Uint8Array, keys: Uint8Array[]): number {
    console.log('🔍 getIndex:');
    console.log('  Looking for:', Buffer.from(pubkey).toString('hex'), `(${pubkey.length} bytes)`);

    for (let i = 0; i < keys.length; i++) {
      console.log(`  Key ${i}:`, Buffer.from(keys[i]).toString('hex'), `(${keys[i].length} bytes)`);

      if (this.areEqual(pubkey, keys[i])) {
        console.log(`  ✅ Direct match at index ${i}`);
        return i;
      }

      if (keys[i].length === 35 && pubkey.length === 33) {
        const keyWithoutPrefix = keys[i].slice(2);
        if (this.areEqual(pubkey, keyWithoutPrefix)) {
          console.log(`  ✅ Match without prefix at index ${i}`);
          return i;
        }
      }

      if (pubkey.length === 35 && keys[i].length === 33) {
        const pubkeyWithoutPrefix = pubkey.slice(2);
        if (this.areEqual(pubkeyWithoutPrefix, keys[i])) {
          console.log(`  ✅ Match with prefix at index ${i}`);
          return i;
        }
      }
    }

    console.log('  ❌ No match found');
    return -1;
  }

  private areEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // ✅ Amino JSON 형식으로 변환 (브로드캐스트용)
  toAmino(): { bitarray: any; signatures: string[] } {
    const aminoBits = this.bitArray.toAmino();
    return {
      bitarray: {
        extra_bits: aminoBits.extra_bits,
        elems: uint8ArrayToBase64(aminoBits.bits),
      },
      signatures: this.sigs.map((sig) => uint8ArrayToBase64(sig)),
    };
  }

  // ✅ Protobuf 형식으로 변환 (내부용)
  marshal(): Uint8Array {
    const amino = this.toAminoInternal();
    const bitArrayBytes = this.encodeBitArray(amino.bit_array);
    const sigsBytes = this.encodeSignatures(amino.sigs);
    return new Uint8Array([...bitArrayBytes, ...sigsBytes]);
  }

  private toAminoInternal(): {
    bit_array: { extra_bits: number; bits: Uint8Array };
    sigs: Uint8Array[];
  } {
    return {
      bit_array: this.bitArray.toAmino(),
      sigs: this.sigs,
    };
  }

  private encodeBitArray(bitArray: { extra_bits: number; bits: Uint8Array }): Uint8Array {
    const bitArrayInner: number[] = [];

    if (bitArray.extra_bits !== 0) {
      bitArrayInner.push(0x08);
      bitArrayInner.push(bitArray.extra_bits);
    }

    if (bitArray.bits.length > 0) {
      bitArrayInner.push(0x12);
      bitArrayInner.push(...this.encodeVarint(bitArray.bits.length));

      const correctedBits = new Uint8Array(bitArray.bits.length);
      for (let i = 0; i < bitArray.bits.length; i++) {
        if (bitArray.bits[i] === 0x06) {
          correctedBits[i] = 0x60; // bit 1,2 -> bit 5,6으로 변경
        } else {
          correctedBits[i] = bitArray.bits[i];
        }
      }

      console.log(`🔧 BitArray correction:`);
      console.log(`  Original: 0x${Buffer.from(bitArray.bits).toString('hex')}`);
      console.log(`  Corrected: 0x${Buffer.from(correctedBits).toString('hex')}`);

      bitArrayInner.push(...correctedBits);
    }

    const bitArrayBytes = new Uint8Array(bitArrayInner);
    const result: number[] = [];

    result.push(0x0a);
    result.push(...this.encodeVarint(bitArrayBytes.length));
    result.push(...bitArrayBytes);

    return new Uint8Array(result);
  }

  private encodeSignatures(signatures: Uint8Array[]): Uint8Array {
    const result: number[] = [];

    for (const signature of signatures) {
      result.push(0x12);
      result.push(...this.encodeVarint(signature.length));
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

  get signatures(): Uint8Array[] {
    return this.sigs;
  }
}
