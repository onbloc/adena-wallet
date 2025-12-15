class Multisignature {
  bitArray: CompactBitArray;
  sigs: Uint8Array[];

  constructor(n: number) {
    this.bitArray = new CompactBitArray(n);
    this.sigs = [];
  }

  addSignature(sig: Uint8Array, index: number): void {
    const newSigIndex = this.bitArray.numTrueBitsBefore(index);

    if (this.bitArray.getIndex(index)) {
      this.sigs[newSigIndex] = sig;
      return;
    }

    this.bitArray.setIndex(index, true);

    if (newSigIndex === this.sigs.length) {
      this.sigs.push(sig);
      return;
    }

    this.sigs.splice(newSigIndex, 0, sig);
  }

  addSignatureFromPubKey(sig: Uint8Array, pubkey: Uint8Array, keys: Uint8Array[]): void {
    const index = this.getIndex(pubkey, keys);
    if (index === -1) {
      const keysStr = keys.map((k) => toHex(k)).join('\n');
      throw new Error(`Provided key ${toHex(pubkey)} doesn't exist in pubkeys:\n${keysStr}`);
    }
    this.addSignature(sig, index);
  }

  private getIndex(pk: Uint8Array, keys: Uint8Array[]): number {
    for (let i = 0; i < keys.length; i++) {
      if (this.equalBytes(pk, keys[i])) {
        return i;
      }
    }
    return -1;
  }

  private equalBytes(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  toJSON(): any {
    return {
      BitArray: this.bitArray.toJSON(),
      Sigs: this.sigs.map((sig) => Array.from(sig)),
    };
  }

  marshal(): string {
    const json = JSON.stringify(this.toJSON());
    return btoa(json);
  }
}

/**
 * Helper functions
 */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Create broadcast document from multisig signatures
 */
function createBroadcastDocument(params: {
  tx: any;
  multisigPubKey: {
    type: string;
    value: string;
  };
  threshold: number;
  signatures: Array<{
    pub_key: {
      type: string;
      value: string;
    };
    signature: string;
  }>;
}): any {
  const { tx, multisigPubKey, threshold, signatures } = params;

  // 1. Verify signature count
  if (signatures.length < threshold) {
    throw new Error(`Not enough signatures. Required: ${threshold}, Got: ${signatures.length}`);
  }

  // 2. Parse multisig pubkey to get individual pubkeys
  const multisigPubKeyDecoded = JSON.parse(atob(multisigPubKey.value));
  const pubKeys: Uint8Array[] = multisigPubKeyDecoded.pubkeys.map((pk: any) =>
    fromBase64(pk.value),
  );

  // 3. Create Multisignature
  const multisig = new Multisignature(pubKeys.length);

  // 4. Add each signature
  for (const sigData of signatures) {
    const sig = fromBase64(sigData.signature);
    const pubkey = fromBase64(sigData.pub_key.value);

    multisig.addSignatureFromPubKey(sig, pubkey, pubKeys);
  }

  // 5. Marshal multisignature (Amino JSON -> base64)
  const multisigBase64 = multisig.marshal();

  // 6. Create final signature
  const finalSignature = {
    pub_key: multisigPubKey,
    signature: multisigBase64,
  };

  // 7. Create broadcast document
  const broadcastDoc = {
    msg: tx.msg,
    fee: tx.fee,
    signatures: [finalSignature],
    memo: tx.memo || '',
  };

  return broadcastDoc;
}
