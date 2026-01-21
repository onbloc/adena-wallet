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

export function documentToDefaultTx(document: Document): Tx {
  const messages: Any[] = document.msgs.map(encodeMessageValue);
  return {
    messages,
    fee: TxFee.create({
      gas_wanted: document.fee.gas,
      gas_fee: document.fee.amount
        .map((feeAmount) => `${feeAmount.amount}${feeAmount.denom}`)
        .join(','),
    }),
    signatures: [
      {
        pub_key: {
          type_url: '',
          value: new Uint8Array(),
        },
        signature: new Uint8Array(),
      },
    ],
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

export type RawTxMessageType =
  | RawBankSendMessage
  | RawVmCallMessage
  | RawVmAddPackageMessage
  | RawVmRunMessage;

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
