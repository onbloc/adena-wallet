import type { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import type { SerializedSignDoc } from '@inject/types';

import { base64ToBytes, bytesToBase64 } from './encoding-util';

// SignDoc carries `Uint8Array` (bodyBytes, authInfoBytes) and `bigint`
// (accountNumber), neither of which survive `JSON.stringify`. The extension
// boundary between content script and background routes through
// `chrome.runtime.sendMessage`, which applies JSON serialization — so Cosmos
// requests must cross that boundary in a string-only shape and be rebuilt on
// the receiving side.

export function serializeSignDoc(signDoc: SignDoc): SerializedSignDoc {
  return {
    bodyBytes: bytesToBase64(Array.from(signDoc.bodyBytes)),
    authInfoBytes: bytesToBase64(Array.from(signDoc.authInfoBytes)),
    chainId: signDoc.chainId,
    accountNumber: signDoc.accountNumber.toString(),
  };
}

export function deserializeSignDoc(serialized: SerializedSignDoc): SignDoc {
  return {
    bodyBytes: Uint8Array.from(base64ToBytes(serialized.bodyBytes)),
    authInfoBytes: Uint8Array.from(base64ToBytes(serialized.authInfoBytes)),
    chainId: serialized.chainId,
    accountNumber: BigInt(serialized.accountNumber),
  };
}

export function serializeTxBytes(tx: Uint8Array): string {
  return bytesToBase64(Array.from(tx));
}

export function deserializeTxBytes(serialized: string): Uint8Array {
  return Uint8Array.from(base64ToBytes(serialized));
}
