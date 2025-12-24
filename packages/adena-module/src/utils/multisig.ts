import { Any, defaultAddressPrefix } from '@gnolang/tm2-js-client';
import { sha256 } from '../crypto';
import { PubKeyMultisig } from '@gnolang/tm2-js-client/bin/proto/tm2/multisig';
import { toBech32 } from '../encoding';

/**
 * Protobuf varint encoding
 */
function encodeVarint(n: number): Uint8Array {
  const bytes: number[] = [];
  while (n > 0x7f) {
    bytes.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  bytes.push(n & 0x7f);
  return new Uint8Array(bytes);
}

/**
 * Protobuf field key encoding
 */
function encodeFieldKey(fieldNum: number, wireType: number): Uint8Array {
  return encodeVarint((fieldNum << 3) | wireType);
}

/**
 * Protobuf length-delimited encoding
 */
function encodeLengthDelimited(fieldNum: number, data: Uint8Array): Uint8Array {
  const key = encodeFieldKey(fieldNum, 2); // wireType 2 = length-delimited
  const length = encodeVarint(data.length);

  const result = new Uint8Array(key.length + length.length + data.length);
  result.set(key, 0);
  result.set(length, key.length);
  result.set(data, key.length + length.length);

  return result;
}

/**
 * Protobuf string encoding
 */
function encodeString(fieldNum: number, str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encodeLengthDelimited(fieldNum, encoder.encode(str));
}

/**
 * Amino Any type encoding
 */
function encodeAminoAny(typeUrl: string, value: Uint8Array): Uint8Array {
  const typeUrlEncoded = encodeString(1, typeUrl);
  const valueEncoded = encodeLengthDelimited(2, value);

  const result = new Uint8Array(typeUrlEncoded.length + valueEncoded.length);
  result.set(typeUrlEncoded, 0);
  result.set(valueEncoded, typeUrlEncoded.length);

  return result;
}

/**
 * Single Public Key encoding (Amino -> Protobuf Any)
 */
function encodePubKey(pubkeyBytes: Uint8Array, typeUrl: string): Uint8Array {
  // Use raw public key as is (no need to remove Amino prefix)
  // Protobuf encoding: field 1 = key (bytes)
  const valueEncoded = encodeLengthDelimited(1, pubkeyBytes);

  return encodeAminoAny(typeUrl, valueEncoded);
}

/**
 * Multisig Public Key encoding
 */
function encodeMultisigPubKey(threshold: number, pubkeys: Any[]): Uint8Array {
  const parts: Uint8Array[] = [];

  // field 1: k (uint32) - threshold
  const thresholdKey = encodeFieldKey(1, 0); // wireType 0 = varint
  const thresholdValue = encodeVarint(threshold);
  const thresholdEncoded = new Uint8Array(thresholdKey.length + thresholdValue.length);
  thresholdEncoded.set(thresholdKey, 0);
  thresholdEncoded.set(thresholdValue, thresholdKey.length);
  parts.push(thresholdEncoded);

  // field 2: pubkeys (repeated) - encode each pubkey as Any
  for (const pubkey of pubkeys) {
    const encodedPubkey = encodePubKey(pubkey.value, pubkey.type_url);
    parts.push(encodeLengthDelimited(2, encodedPubkey));
  }

  // Combine all parts
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const multisigValue = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    multisigValue.set(part, offset);
    offset += part.length;
  }

  // Wrap everything in Any
  return encodeAminoAny('/tm.PubKeyMultisig', multisigValue);
}

/**
 * Convert Proto object to Amino and generate multisig public key
 * @param multisigPubKey - PubKeyMultisig object
 * @param addressPrefix - Address prefix (default: 'g')
 * @returns { address, publicKey } - Bech32 address and Amino encoded public key
 */
export function createMultisigPublicKey(
  multisigPubKey: PubKeyMultisig,
  addressPrefix: string = defaultAddressPrefix,
): { address: string; publicKey: Uint8Array } {
  const aminoEncoded = encodeMultisigPubKey(multisigPubKey.k.toNumber(), multisigPubKey.pub_keys);
  const hash = sha256(aminoEncoded);
  const addressBytes = hash.slice(0, 20);
  const address = toBech32(addressPrefix, addressBytes);

  return {
    address,
    publicKey: aminoEncoded,
  };
}

/**
 * Base64 decoding (for multisig)
 */
export function fromBase64Multisig(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Base64 encoding (for multisig)
 */
export function toBase64Multisig(bytes: Uint8Array): string {
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}

export function convertMessageToAmino(msg: any): { type: string; value: any } {
  if (msg.type && msg.value) {
    return msg;
  }
  const { '@type': type, ...value } = msg;
  return { type, value };
}
