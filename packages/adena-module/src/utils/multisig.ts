import { defaultAddressPrefix } from '@gnolang/tm2-js-client';
import {
  pubkeyToAddress,
  encodeSecp256k1Pubkey,
  createMultisigThresholdPubkey,
  MultisigThresholdPubkey,
} from '@cosmjs/amino';
import { Secp256k1 } from '@cosmjs/crypto';

/**
 * Creates a multisig public key and address from signer public keys
 *
 * @param publicKeys - Array of signer public keys (uncompressed, 65 bytes each)
 * @param threshold - Minimum number of signatures required (K of N)
 * @param addressPrefix - Address prefix (default: 'g')
 * @returns Object with multisig public key and address
 */
export function createMultisigPublicKey(
  publicKeys: Uint8Array[],
  threshold: number,
  addressPrefix: string = defaultAddressPrefix,
): {
  publicKey: Uint8Array;
  address: string;
} {
  // Validation
  if (threshold <= 0) {
    throw new Error('threshold k of n multisignature: k <= 0');
  }
  if (publicKeys.length < threshold) {
    throw new Error('threshold k of n multisignature: len(pubkeys) < k');
  }
  for (const pubkey of publicKeys) {
    if (!pubkey || pubkey.length === 0) {
      throw new Error('nil pubkey');
    }
  }

  // Sort public keys by their addresses (matching Gno.land behavior)
  const sortedPubKeys = sortPublicKeysByAddress(publicKeys, addressPrefix);

  // Convert to Secp256k1Pubkey format for @cosmjs
  const secp256k1Pubkeys = sortedPubKeys.map((pubKey) => {
    const compressedPubKey = Secp256k1.compressPubkey(pubKey);
    return encodeSecp256k1Pubkey(compressedPubKey);
  });

  // Create multisig pubkey using @cosmjs
  const multisigPubkey = createMultisigThresholdPubkey(secp256k1Pubkeys, threshold);

  // Encode to bytes (Amino format)
  const multisigPubkeyBytes = encodeMultisigPubkeyToBytes(multisigPubkey);

  // Generate address
  const address = pubkeyToAddress(multisigPubkey, addressPrefix);

  return {
    publicKey: multisigPubkeyBytes,
    address,
  };
}

/**
 * Sorts public keys by their bech32 addresses (ascending order)
 * Matches Gno.land's sorting logic
 */
function sortPublicKeysByAddress(
  publicKeys: Uint8Array[],
  addressPrefix: string = defaultAddressPrefix,
): Uint8Array[] {
  const pubKeysWithAddresses = publicKeys.map((pubKey) => {
    const compressedPubKey = Secp256k1.compressPubkey(pubKey);
    const encodedPubKey = encodeSecp256k1Pubkey(compressedPubKey);
    const address = pubkeyToAddress(encodedPubKey, addressPrefix);

    return { pubKey, address };
  });

  // Sort by address string comparison
  pubKeysWithAddresses.sort((a, b) => a.address.localeCompare(b.address));

  return pubKeysWithAddresses.map((item) => item.pubKey);
}

/**
 * Encodes MultisigThresholdPubkey to Amino bytes
 * This matches tm2's PubKeyMultisigThreshold encoding
 */
function encodeMultisigPubkeyToBytes(pubkey: MultisigThresholdPubkey): Uint8Array {
  // Amino type prefix for PubKeyMultisigThreshold
  const MULTISIG_TYPE_PREFIX = new Uint8Array([0x22, 0xc1, 0xf7, 0xe2]);

  const parts: Uint8Array[] = [];
  parts.push(MULTISIG_TYPE_PREFIX);

  // Field 1: threshold (varint)
  parts.push(encodeFieldKey(1, 0));
  parts.push(encodeVarint(parseInt(pubkey.value.threshold, 10)));

  // Field 2: public keys (repeated)
  for (const pk of pubkey.value.pubkeys) {
    const pkBytes = encodeSecp256k1PubkeyToBytes(pk);
    parts.push(encodeFieldKey(2, 2));
    parts.push(encodeVarint(pkBytes.length));
    parts.push(pkBytes);
  }

  return concatenateUint8Arrays(parts);
}

/**
 * Encodes Secp256k1Pubkey to Amino bytes
 */
function encodeSecp256k1PubkeyToBytes(pubkey: any): Uint8Array {
  const SECP256K1_TYPE_PREFIX = new Uint8Array([0xeb, 0x5a, 0xe9, 0x87]);

  const keyBytes = new Uint8Array(Buffer.from(pubkey.value, 'base64'));

  const parts: Uint8Array[] = [];
  parts.push(SECP256K1_TYPE_PREFIX);
  parts.push(encodeFieldKey(1, 2));
  parts.push(encodeVarint(keyBytes.length));
  parts.push(keyBytes);

  return concatenateUint8Arrays(parts);
}

function encodeFieldKey(fieldNumber: number, wireType: number): Uint8Array {
  return encodeVarint((fieldNumber << 3) | wireType);
}

function encodeVarint(value: number): Uint8Array {
  const bytes: number[] = [];
  while (value >= 0x80) {
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  bytes.push(value & 0x7f);
  return new Uint8Array(bytes);
}

function concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
