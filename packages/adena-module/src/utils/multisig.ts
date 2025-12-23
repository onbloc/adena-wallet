import { Any, defaultAddressPrefix } from '@gnolang/tm2-js-client';
import { sha256 } from '../crypto';
import { PubKeyMultisig } from '@gnolang/tm2-js-client/bin/proto/tm2/multisig';

/**
 * Bech32 encoding
 */
function bech32Encode(hrp: string, data: Uint8Array): string {
  const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

  // Convert 8-bit data to 5-bit
  const converted: number[] = [];
  let acc = 0;
  let bits = 0;

  for (const byte of data) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      converted.push((acc >> bits) & 0x1f);
    }
  }

  if (bits > 0) {
    converted.push((acc << (5 - bits)) & 0x1f);
  }

  // Calculate checksum
  const checksum = bech32Checksum(hrp, converted);
  const combined = [...converted, ...checksum];

  return hrp + '1' + combined.map((d) => CHARSET[d]).join('');
}

function bech32Checksum(hrp: string, data: number[]): number[] {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const polymod = bech32Polymod(values) ^ 1;
  const checksum: number[] = [];
  for (let i = 0; i < 6; i++) {
    checksum.push((polymod >> (5 * (5 - i))) & 0x1f);
  }
  return checksum;
}

function bech32HrpExpand(hrp: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < hrp.length; i++) {
    result.push(hrp.charCodeAt(i) >> 5);
  }
  result.push(0);
  for (let i = 0; i < hrp.length; i++) {
    result.push(hrp.charCodeAt(i) & 0x1f);
  }
  return result;
}

function bech32Polymod(values: number[]): number {
  const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) {
        chk ^= GENERATOR[i];
      }
    }
  }
  return chk;
}

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
  const address = bech32Encode(addressPrefix, addressBytes);

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
