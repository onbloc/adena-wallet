import { Any, defaultAddressPrefix, PubKeySecp256k1 } from '@gnolang/tm2-js-client';
import { PubKeyMultisig } from '@gnolang/tm2-js-client/bin/proto/tm2/multisig';
import Long from 'long';
import { sha256 } from '../crypto';
import { toBech32 } from '../encoding';

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
  addressPrefix: string = defaultAddressPrefix,
): { address: string; publicKey: Uint8Array } {
  const publicKeysAny = publicKeys.map((pk) => {
    return Any.create({
      type_url: pk['@type'],
      value: pk.value,
    });
  });

  const aminoEncoded = encodeMultisigPubKey(threshold, publicKeysAny);
  const hash = sha256(aminoEncoded);
  const addressBytes = hash.slice(0, 20);
  const address = toBech32(addressPrefix, addressBytes);

  return {
    address,
    publicKey: aminoEncoded,
  };
}

export function convertMessageToAmino(msg: any): { type: string; value: any } {
  if (msg.type && msg.value) {
    return msg;
  }
  const { '@type': type, ...value } = msg;
  return { type, value };
}

/**
 * Multisig Public Key encoding using Protobuf library
 */
function encodeMultisigPubKey(threshold: number, pubkeys: Any[]): Uint8Array {
  const pubKeysEncoded = pubkeys.map((pk) => {
    const pubKeyValue = PubKeySecp256k1.encode({
      key: pk.value,
    }).finish();

    return Any.create({
      type_url: pk.type_url,
      value: pubKeyValue,
    });
  });

  const multisigValue = PubKeyMultisig.encode({
    k: Long.fromNumber(threshold),
    pub_keys: pubKeysEncoded,
  }).finish();

  const result = Any.create({
    type_url: '/tm.PubKeyMultisig',
    value: multisigValue,
  });

  return Any.encode(result).finish();
}
