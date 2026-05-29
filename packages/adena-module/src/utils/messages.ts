import {
  Any,
  MemFile,
  MemPackage,
  MsgAddPackage,
  MsgCall,
  MsgEndpoint,
  MsgRun,
  MsgSend,
} from '@gnolang/gno-js-client';
import { PubKeySecp256k1, Tx, TxFee, TxSignature } from '@gnolang/tm2-js-client';
import { PubKeyMultisig } from '@gnolang/tm2-js-client/bin/proto/tm2/multisig';
import Long from 'long';

import { fromBase64, toBase64 } from '../encoding';
import { MsgCreateSession, MsgRevokeSession, MsgRevokeAllSessions } from '../proto';
import { LocalTxSignature } from '../proto/session/local-tx-signature';
import { compressPubkeyIfNeeded } from './pubkey';
import {
  MSG_CREATE_SESSION_ENDPOINT,
  MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
  MSG_REVOKE_SESSION_ENDPOINT,
} from './session-message-endpoints';

export interface Document {
  chain_id: string;
  account_number: string;
  sequence: string;
  fee: {
    amount: {
      denom: string;
      amount: string;
    }[];
    gas: string;
    granter?: string;
    payer?: string;
  };
  msgs: {
    type: string;
    value: any;
  }[];
  memo: string;
  signatures?: {
    pub_key: {
      '@type': string;
      threshold?: string;
      pubkeys?: {
        '@type': string;
        value: string;
      }[];
      value?: string;
    };
    signature: string;
  }[];
}

export const decodeTxMessages = (messages: Any[]): any[] => {
  return messages.map((m: Any) => {
    switch (m.type_url) {
      case MsgEndpoint.MSG_CALL: {
        const decodedMessage = MsgCall.decode(m.value);
        const messageJson = MsgCall.toJSON(decodedMessage) as any;
        return {
          '@type': m.type_url,
          ...messageJson,
        };
      }
      case MsgEndpoint.MSG_SEND: {
        const decodedMessage = MsgSend.decode(m.value);
        const messageJson = MsgSend.toJSON(decodedMessage) as any;
        return {
          '@type': m.type_url,
          ...messageJson,
        };
      }
      case MsgEndpoint.MSG_ADD_PKG: {
        const decodedMessage = MsgAddPackage.decode(m.value);
        const messageJson = MsgAddPackage.toJSON(decodedMessage) as any;
        return {
          '@type': m.type_url,
          ...messageJson,
        };
      }
      case MsgEndpoint.MSG_RUN: {
        const decodedMessage = MsgRun.decode(m.value);
        const messageJson = MsgRun.toJSON(decodedMessage) as any;
        return {
          '@type': m.type_url,
          ...messageJson,
        };
      }
      case MSG_CREATE_SESSION_ENDPOINT: {
        const decodedMessage = MsgCreateSession.decode(m.value);
        const messageJson = MsgCreateSession.toJSON(decodedMessage) as any;
        messageJson.expires_at = decodedMessage.expires_at.toString();
        // Chain's amino-JSON for crypto.PubKey uses "@type" and emits the raw
        // 33-byte compressed pubkey base64 (not the proto-wrapped PubKey
        // message). MsgCreateSession.expires_at has no omitempty tag in Go,
        // so force it to remain present even when it is 0. Other zero-value
        // fields keep the generated toJSON omitempty behavior.
        if (messageJson.session_key && messageJson.session_key.type_url !== undefined) {
          messageJson.session_key = aminoizePubKeyAny(
            messageJson.session_key,
            decodedMessage.session_key?.value,
          );
        }
        return {
          '@type': m.type_url,
          ...messageJson,
        };
      }
      case MSG_REVOKE_SESSION_ENDPOINT: {
        const decodedMessage = MsgRevokeSession.decode(m.value);
        const messageJson = MsgRevokeSession.toJSON(decodedMessage) as any;
        if (messageJson.session_key && messageJson.session_key.type_url !== undefined) {
          messageJson.session_key = aminoizePubKeyAny(
            messageJson.session_key,
            decodedMessage.session_key?.value,
          );
        }
        return {
          '@type': m.type_url,
          ...messageJson,
        };
      }
      case MSG_REVOKE_ALL_SESSIONS_ENDPOINT: {
        const decodedMessage = MsgRevokeAllSessions.decode(m.value);
        const messageJson = MsgRevokeAllSessions.toJSON(decodedMessage) as any;
        return {
          '@type': m.type_url,
          ...messageJson,
        };
      }
      default:
        throw new Error(`unsupported message type ${m.type_url}`);
    }
  });
};

function createMemPackage(memPackage: RawMemPackage): any {
  return MemPackage.create({
    name: memPackage.name,
    path: memPackage.path,
    files: memPackage.files.map((file: any) =>
      MemFile.create({
        name: file.name,
        body: file.body,
      }),
    ),
  });
}

// Coerce an `Any`-shaped field back into proper proto form after a
// JSON round-trip. When InjectionMessage is shipped across the popup
// query string it goes JSON.stringify -> encodeURI -> base64 -> reverse,
// and the embedded Uint8Array in `value` is silently rehydrated as a
// plain `{0:..,1:..}` object (or string, or number[]). The proto
// BinaryWriter.bytes() asserts on `.length`, so an unnormalized shape
// trips `invalid uint32: undefined`.
function toUint8Array(input: unknown): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (Array.isArray(input)) return Uint8Array.from(input as number[]);
  if (typeof input === 'string') return fromBase64(input);
  if (input && typeof input === 'object') {
    const indexed = input as { [k: string]: number };
    const keys = Object.keys(indexed)
      .filter((k) => /^\d+$/.test(k))
      .map((k) => Number(k))
      .sort((a, b) => a - b);
    if (keys.length > 0) {
      const out = new Uint8Array(keys.length);
      for (let i = 0; i < keys.length; i++) {
        out[i] = indexed[String(keys[i])];
      }
      return out;
    }
  }
  return new Uint8Array(0);
}

function normalizeAnyField(
  anyField: { type_url?: string; value?: unknown } | undefined,
): { type_url: string; value: Uint8Array } | undefined {
  if (!anyField) return undefined;
  return {
    type_url: anyField.type_url ?? '',
    value: toUint8Array(anyField.value),
  };
}

// Convert a proto-encoded PubKey Any into the amino-JSON form the gno chain
// emits in GetSignBytes:
//   wallet (proto Any.toJSON): { type_url, value: base64(<proto-encoded PubKey
//                                                          message: 0a 21 <33 bytes>>) }
//   chain (amino JSON):        { "@type": ...,
//                                value: base64(<raw 33-byte compressed pubkey>) }
// Both the key name (@type vs type_url) AND the value content (raw pubkey bytes
// vs proto-wrapped pubkey bytes) differ, so we unwrap the inner PubKeySecp256k1
// message to expose the raw `key` bytes before base64-encoding.
function aminoizePubKeyAny(
  any: { type_url?: string; value?: unknown },
  protoEncodedValueBytes: Uint8Array | undefined,
): { '@type': string; value: string } {
  let valueBase64 = typeof any.value === 'string' ? any.value : '';
  if (protoEncodedValueBytes && protoEncodedValueBytes.length > 0) {
    try {
      const pubKey = PubKeySecp256k1.decode(protoEncodedValueBytes);
      valueBase64 = toBase64(pubKey.key);
    } catch {
      // Fall back to whatever Any.toJSON produced; chain will still reject,
      // but the user gets a deterministic error rather than a JS exception.
    }
  }
  return {
    '@type': any.type_url ?? '',
    value: valueBase64,
  };
}

function encodeMessageValue(message: { type: string; value: any }) {
  switch (message.type) {
    case MsgEndpoint.MSG_ADD_PKG: {
      const value = message.value;
      const msgAddPackage = MsgAddPackage.create({
        creator: value.creator,
        send: value.send || '',
        max_deposit: value?.max_deposit || '',
        package: value.package ? createMemPackage(value.package) : undefined,
      });
      return Any.create({
        type_url: MsgEndpoint.MSG_ADD_PKG,
        value: MsgAddPackage.encode(msgAddPackage).finish(),
      });
    }
    case MsgEndpoint.MSG_CALL: {
      const args: string[] = message.value.args
        ? message.value.args.length === 0
          ? null
          : message.value.args
        : null;
      const result = MsgCall.create({
        args: args,
        caller: message.value.caller,
        func: message.value.func,
        pkg_path: message.value.pkg_path,
        send: message.value.send || '',
        max_deposit: message.value.max_deposit || '',
      });
      return Any.create({
        type_url: MsgEndpoint.MSG_CALL,
        value: MsgCall.encode(result).finish(),
      });
    }
    case MsgEndpoint.MSG_SEND: {
      return Any.create({
        type_url: MsgEndpoint.MSG_SEND,
        value: MsgSend.encode(MsgSend.create(message.value)).finish(),
      });
    }
    case MsgEndpoint.MSG_RUN: {
      const value = message.value;
      const msgRun = MsgRun.create({
        caller: value.caller,
        send: value.send || null,
        package: value.package ? createMemPackage(value.package) : undefined,
        max_deposit: value?.max_deposit || '',
      });
      return Any.create({
        type_url: MsgEndpoint.MSG_RUN,
        value: MsgRun.encode(msgRun).finish(),
      });
    }
    case MSG_CREATE_SESSION_ENDPOINT: {
      const value = message.value;
      const msg = MsgCreateSession.create({
        creator: value.creator,
        session_key: normalizeAnyField(value.session_key),
        expires_at: value.expires_at != null ? Long.fromValue(value.expires_at) : Long.ZERO,
        allow_paths: value.allow_paths || [],
        spend_limit: value.spend_limit || '',
        spend_period:
          value.spend_period != null ? Long.fromValue(value.spend_period) : Long.ZERO,
      });
      return Any.create({
        type_url: MSG_CREATE_SESSION_ENDPOINT,
        value: MsgCreateSession.encode(msg).finish(),
      });
    }
    case MSG_REVOKE_SESSION_ENDPOINT: {
      const value = message.value;
      const msg = MsgRevokeSession.create({
        creator: value.creator,
        session_key: normalizeAnyField(value.session_key),
      });
      return Any.create({
        type_url: MSG_REVOKE_SESSION_ENDPOINT,
        value: MsgRevokeSession.encode(msg).finish(),
      });
    }
    case MSG_REVOKE_ALL_SESSIONS_ENDPOINT: {
      const value = message.value;
      const msg = MsgRevokeAllSessions.create({ creator: value.creator });
      return Any.create({
        type_url: MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
        value: MsgRevokeAllSessions.encode(msg).finish(),
      });
    }
    default: {
      return Any.create({
        type_url: MsgEndpoint.MSG_CALL,
        value: MsgCall.encode(MsgCall.fromJSON(message.value)).finish(),
      });
    }
  }
}

export function combineMultisigPublicKey(pubKeys: RawPubKey[], threshold: number): RawPubKey {
  if (pubKeys.length === 0) {
    throw new Error('No public keys provided');
  }

  if (pubKeys.length < threshold) {
    throw new Error('Insufficient public keys provided');
  }

  const multisigPubKey = {
    threshold: threshold,
    pubkeys:
      pubKeys?.map((pk) => ({
        type_url: pk['@type'],
        value: PubKeySecp256k1.encode({
          key: fromBase64(pk.value),
        }).finish(),
      })) || [],
  };

  const resultPubKey = Any.create({
    type_url: '/tm.PubKeyMultisig',
    value: PubKeyMultisig.encode({
      k: Long.fromNumber(multisigPubKey.threshold),
      pub_keys: multisigPubKey.pubkeys.map((pk) =>
        Any.create({
          type_url: pk.type_url,
          value: pk.value,
        }),
      ),
    }).finish(),
  });

  return {
    '@type': resultPubKey.type_url,
    value: toBase64(resultPubKey.value),
  };
}

export function documentToTx(document: Document): Tx {
  const messages: Any[] = document.msgs.map(encodeMessageValue);

  const signatures: TxSignature[] =
    document.signatures?.map((sig) => {
      let pubKeyAny: Any;

      if (sig.pub_key['@type'] === '/tm.PubKeyMultisig') {
        const multisigPubKey = {
          threshold: parseInt(sig.pub_key.threshold || '1'),
          pubkeys:
            sig.pub_key.pubkeys?.map((pk) => ({
              type_url: pk['@type'],
              value: PubKeySecp256k1.encode({
                key: fromBase64(pk.value),
              }).finish(),
            })) || [],
        };

        pubKeyAny = Any.create({
          type_url: sig.pub_key['@type'],
          value: PubKeyMultisig.encode({
            k: Long.fromNumber(multisigPubKey.threshold),
            pub_keys: multisigPubKey.pubkeys.map((pk) =>
              Any.create({
                type_url: pk.type_url,
                value: pk.value,
              }),
            ),
          }).finish(),
        });
      } else {
        const publicKeyBytes = fromBase64(sig.pub_key.value || '');
        const wrappedPublicKeyValue: PubKeySecp256k1 = {
          key: publicKeyBytes,
        };
        const encodedPublicKeyBytes = PubKeySecp256k1.encode(wrappedPublicKeyValue).finish();

        pubKeyAny = {
          type_url: sig.pub_key['@type'],
          value: encodedPublicKeyBytes,
        };
      }

      return TxSignature.create({
        pub_key: pubKeyAny,
        signature: fromBase64(sig.signature),
      });
    }) || [];

  return {
    messages,
    fee: TxFee.create({
      gas_wanted: document.fee.gas,
      gas_fee: document.fee.amount
        .map((feeAmount) => `${feeAmount.amount}${feeAmount.denom}`)
        .join(','),
    }),
    signatures,
    memo: document.memo,
  };
}

export function documentToDefaultTx(
  document: Document,
  publicKey?: Uint8Array,
  sessionAddr?: string,
): Tx {
  const messages: Any[] = document.msgs.map(encodeMessageValue);
  // gno.land /app/simulate skips signature verification but still validates
  // pub_key to signer-address derivation. When the caller has a pubkey (e.g. a
  // Ledger account whose signing requires hardware that isn't attached during
  // gas estimation), include it so simulate accepts the placeholder tx for
  // pre-initialized accounts. Callers with no pubkey (AirGap) pass undefined
  // and keep the historical empty placeholder.
  //
  // SessionAccount path supplies sessionAddr so the placeholder signature
  // carries session_addr; the encodeGnoTx wire encoder will emit field 3 and
  // the node's ante handler routes the simulate as a session signature
  // (pubkey to session address) instead of failing the master pubkey-address
  // derivation check.
  const pubKey =
    publicKey && publicKey.length > 0
      ? {
          type_url: '/tm.PubKeySecp256k1',
          value: PubKeySecp256k1.encode({
            key: compressPubkeyIfNeeded(publicKey),
          }).finish(),
        }
      : {
          type_url: '',
          value: new Uint8Array(),
        };
  const signature: TxSignature =
    sessionAddr !== undefined && sessionAddr !== ''
      ? ({
          pub_key: pubKey,
          signature: new Uint8Array(),
          session_addr: sessionAddr,
        } as LocalTxSignature as TxSignature)
      : {
          pub_key: pubKey,
          signature: new Uint8Array(),
        };
  return {
    messages,
    fee: TxFee.create({
      gas_wanted: document.fee.gas,
      gas_fee: document.fee.amount
        .map((feeAmount) => `${feeAmount.amount}${feeAmount.denom}`)
        .join(','),
    }),
    signatures: [signature],
    memo: document.memo,
  };
}

export function txToDocument(tx: Tx) {
  return Tx.toJSON(tx);
}

export interface RawBankSendMessage {
  '@type': string;
  from_address: string;
  to_address: string;
  amount: string;
}

export interface RawVmCallMessage {
  '@type': string;
  caller: string;
  func: string;
  send: string;
  pkg_path: string;
  max_deposit: string;
  args: string[];
}

export interface RawVmAddPackageMessage {
  '@type': string;
  creator: string;
  send: string;
  max_deposit: string;
  package: RawMemPackage;
}

export interface RawVmRunMessage {
  '@type': string;
  caller: string;
  send: string;
  max_deposit: string;
  package: RawMemPackage;
}

export interface RawMemPackage {
  name: string;
  path: string;
  files: {
    name: string;
    body: string;
  }[];
  info?: {
    type_url: string;
    value: string;
  };
  type?: {
    type_url: string;
    value: string;
  };
}

export interface RawMsgCreateSession {
  '@type': string;
  creator: string;
  session_key?: {
    type_url: string;
    value: string;
  };
  expires_at: string;
  allow_paths: string[];
  spend_limit: string;
  spend_period: string;
}

export interface RawMsgRevokeSession {
  '@type': string;
  creator: string;
  session_key?: {
    type_url: string;
    value: string;
  };
}

export interface RawMsgRevokeAllSessions {
  '@type': string;
  creator: string;
}

export type RawTxMessageType =
  | RawBankSendMessage
  | RawVmCallMessage
  | RawVmAddPackageMessage
  | RawVmRunMessage
  | RawMsgCreateSession
  | RawMsgRevokeSession
  | RawMsgRevokeAllSessions;

export interface RawTx {
  msg: RawTxMessageType[];
  fee: { gas_wanted: string; gas_fee: string };
  signatures: RawSignature[] | null;
  memo: string;
}

export interface RawPubKey {
  '@type': string;
  value: string;
}

export interface RawSignature {
  pub_key: RawPubKey;
  signature: string;
}

/**
 * Change transaction json string to a Signed Tx.
 *
 * @param str
 * @returns Tx | null
 */
export const strToSignedTx = (str: string): Tx | null => {
  let rawTx = null;
  try {
    rawTx = JSON.parse(str);
  } catch (e) {
    console.error(e);
  }

  if (rawTx === null) return null;

  return rawTxToTx(rawTx);
};

export const rawTxToTx = (rawTx: RawTx): Tx | null => {
  try {
    const document = rawTx;
    const messages: Any[] = document.msg
      .map((msg) => ({
        type: msg['@type'],
        value: { ...msg },
      }))
      .map(encodeMessageValue);
    return {
      messages,

      fee: TxFee.create({
        gas_wanted: document.fee.gas_wanted,
        gas_fee: document.fee.gas_fee,
      }),
      signatures: (document.signatures || []).map(rawSignatureToTxSignature),
      memo: document.memo,
    };
  } catch (e) {
    console.error(e);
    return null;
  }
};

const rawSignatureToTxSignature = (signature: RawSignature): TxSignature => {
  const signatureType = signature.pub_key['@type'];

  if (signatureType === '/tm.PubKeyMultisig') {
    return TxSignature.create({
      pub_key: {
        type_url: signatureType,
        value: fromBase64(signature.pub_key.value),
      },
      signature: fromBase64(signature.signature),
    });
  }

  const publicKeyBytes = fromBase64(signature?.pub_key?.value || '');
  const wrappedPublicKeyValue: PubKeySecp256k1 = {
    key: publicKeyBytes,
  };
  const encodedPublicKeyBytes = PubKeySecp256k1.encode(wrappedPublicKeyValue).finish();
  const signatureBytes = fromBase64(signature?.signature || '');
  return TxSignature.create({
    pub_key: {
      type_url: signatureType,
      value: encodedPublicKeyBytes,
    },
    signature: signatureBytes,
  });
};
