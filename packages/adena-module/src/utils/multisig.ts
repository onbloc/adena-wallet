import { Any, defaultAddressPrefix } from '@gnolang/tm2-js-client';
import { sha256 } from '../crypto';
import { PubKeyMultisig } from '@gnolang/tm2-js-client/bin/proto/tm2/multisig';
import { PubKeySecp256k1 } from '@gnolang/tm2-js-client';
import { toBech32 } from '../encoding';
import Long from 'long';

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

export function convertMessageToAmino(msg: any): { type: string; value: any } {
  if (msg.type && msg.value) {
    return msg;
  }
  const { '@type': type, ...value } = msg;
  return { type, value };
}
