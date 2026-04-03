import {
  Any, CompactBitArray, defaultAddressPrefix, PubKeySecp256k1
} from '@gnolang/tm2-js-client';
import { PubKeyMultisig } from '@gnolang/tm2-js-client';

import { sha256 } from '../crypto/index.js';
import { toBech32 } from '../encoding/index.js';

export function createCompactBitArray(bits: number): CompactBitArray {
  if (bits <= 0) {
    throw new Error('empty');
  }

  const extraBitsStored = bits % 8;
  const elems = new Uint8Array(Math.ceil(bits / 8));

  return {
    extra_bits_stored: extraBitsStored,
    elems
  };
}

export function compactBitArraySize(bA: CompactBitArray): number {
  if (bA.elems === null) {
    return 0;
  }
  else if (bA.extra_bits_stored === 0) {
    return bA.elems.length * 8;
  }
  return (bA.elems.length - 1) * 8 + bA.extra_bits_stored;
}

// SetIndex sets the bit at index i within the bit array
// Returns true if successful, false if out of bounds or array is null
export function compactBitArraySetIndex(
  bA: CompactBitArray,
  i: number,
  v: boolean
): boolean {
  if (bA.elems === null) {
    return false;
  }

  if (i >= compactBitArraySize(bA)) {
    return false;
  }

  if (v) {
    // Set the bit (most significant bit first)
    bA.elems[i >> 3] |= 1 << (7 - (i % 8));
  }
  else {
    // Clear the bit
    bA.elems[i >> 3] &= ~(1 << (7 - (i % 8)));
  }

  return true;
}
export interface Pubkey {
  '@type': string;
  value: Uint8Array;
}

/**
 * Convert Proto object to Amino and generate multisig public key
 * @param multisigPubKey - PubKeyMultisig object
 * @param addressPrefix - Address prefix (default: 'g')
 * @returns { address, publicKey } - Bech32 address and Amino encoded public key
 */
export function createMultisigPublicKey(
  threshold: number,
  publicKeys: Pubkey[],
  addressPrefix: string = defaultAddressPrefix
): {
  address: string;
  publicKey: Uint8Array;
} {
  const publicKeysAny = publicKeys.map((pk) => {
    return Any.create({
      type_url: pk['@type'],
      value: pk.value
    });
  });

  const aminoEncoded = encodeMultisigPubKey(threshold, publicKeysAny);
  const hash = sha256(aminoEncoded);
  const addressBytes = hash.slice(0, 20);
  const address = toBech32(addressPrefix, addressBytes);

  return {
    address,
    publicKey: aminoEncoded
  };
}

export interface AminoMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally loose for interop with specific message types
  value: Record<string, any>;
}

export interface ProtoMessage {
  '@type': string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally loose for interop with specific message types
  [key: string]: any;
}

export function convertMessageToAmino(msg: ProtoMessage | AminoMessage): AminoMessage {
  if (msg.type && msg.value) {
    return msg as AminoMessage;
  }
  const { '@type': type, ...value } = msg as ProtoMessage;
  return {
    type,
    value
  };
}

/**
 * Multisig Public Key encoding using Protobuf library
 */
function encodeMultisigPubKey(threshold: number, pubkeys: Any[]): Uint8Array {
  const pubKeysEncoded = pubkeys.map((pk) => {
    const pubKeyValue = PubKeySecp256k1.encode({ key: pk.value }).finish();

    return Any.create({
      type_url: pk.type_url,
      value: pubKeyValue
    });
  });

  const multisigValue = PubKeyMultisig.encode({
    k: BigInt(threshold),
    pub_keys: pubKeysEncoded
  }).finish();

  const result = Any.create({
    type_url: '/tm.PubKeyMultisig',
    value: multisigValue
  });

  return Any.encode(result).finish();
}
