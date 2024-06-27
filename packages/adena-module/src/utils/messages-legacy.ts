import { Any, PubKeySecp256k1, Tx, TxFee, TxSignature } from '@gnolang/tm2-js-client-legacy';
import { MsgCall, MsgAddPackage, MsgSend, MsgEndpoint } from '@gnolang/gno-js-client-legacy';
import { MemPackage, MemFile, MsgRun } from '@gnolang/gno-js-client-legacy/bin/proto/gno/vm';
import { fromBase64 } from '../encoding';

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
}

export const decodeTxMessages = (messages: Any[]): any[] => {
  return messages.map((m: Any) => {
    switch (m.typeUrl) {
      case MsgEndpoint.MSG_CALL: {
        const decodedMessage = MsgCall.decode(m.value);
        const messageJson = MsgCall.toJSON(decodedMessage) as any;
        return {
          '@type': m.typeUrl,
          ...messageJson,
          send: messageJson?.send || '',
        };
      }
      case MsgEndpoint.MSG_SEND: {
        const decodedMessage = MsgSend.decode(m.value);
        const messageJson = MsgSend.toJSON(decodedMessage) as object;
        return {
          '@type': m.typeUrl,
          ...messageJson,
        };
      }
      case MsgEndpoint.MSG_ADD_PKG: {
        const decodedMessage = MsgAddPackage.decode(m.value);
        const messageJson = MsgAddPackage.toJSON(decodedMessage) as object;
        return {
          '@type': m.typeUrl,
          ...messageJson,
        };
      }
      case MsgEndpoint.MSG_RUN: {
        const decodedMessage = MsgRun.decode(m.value);
        const messageJson = MsgRun.toJSON(decodedMessage) as object;
        return {
          '@type': m.typeUrl,
          ...messageJson,
        };
      }
      default:
        throw new Error(`unsupported message type ${m.typeUrl}`);
    }
  });
};

function createMemPackage(memPackage: RawMemPackage) {
  return MemPackage.create({
    name: memPackage.Name,
    path: memPackage.Path,
    files: memPackage.Files.map((file: any) =>
      MemFile.create({
        name: file.Name,
        body: file.Body,
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
        deposit: value.deposit || null,
        package: value.package ? createMemPackage(value.package) : undefined,
      });
      return Any.create({
        typeUrl: MsgEndpoint.MSG_ADD_PKG,
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
      });
      return Any.create({
        typeUrl: MsgEndpoint.MSG_CALL,
        value: MsgCall.encode(result).finish(),
      });
    }
    case MsgEndpoint.MSG_SEND: {
      return Any.create({
        typeUrl: MsgEndpoint.MSG_SEND,
        value: MsgSend.encode(MsgSend.create(message.value)).finish(),
      });
    }
    case MsgEndpoint.MSG_RUN: {
      const value = message.value;
      const msgRun = MsgRun.create({
        caller: value.caller,
        send: value.send || null,
        package: value.package ? createMemPackage(value.package) : undefined,
      });
      return Any.create({
        typeUrl: MsgEndpoint.MSG_RUN,
        value: MsgRun.encode(msgRun).finish(),
      });
    }
    default: {
      return Any.create({
        typeUrl: MsgEndpoint.MSG_CALL,
        value: MsgCall.encode(MsgCall.fromJSON(message.value)).finish(),
      });
    }
  }
}

export function documentToTx(document: Document): Tx {
  const messages: Any[] = document.msgs.map(encodeMessageValue);
  return {
    messages,
    fee: TxFee.create({
      gasWanted: document.fee.gas,
      gasFee: document.fee.amount
        .map((feeAmount) => `${feeAmount.amount}${feeAmount.denom}`)
        .join(','),
    }),
    signatures: [],
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
  args: string[];
}

export interface RawVmAddPackageMessage {
  '@type': string;
  creator: string;
  deposit: string;
  package: {
    Name: string;
    Path: string;
    Files: {
      Name: string;
      Body: string;
    }[];
  };
}

export interface RawVmRunMessage {
  '@type': string;
  caller: string;
  send: string;
  package: {
    Name: string;
    Path: string;
    Files: {
      Name: string;
      Body: string;
    }[];
  };
}

export interface RawMemPackage {
  Name: string;
  Path: string;
  Files: {
    Name: string;
    Body: string;
  }[];
}

export type RawTxMessageType =
  | RawBankSendMessage
  | RawVmCallMessage
  | RawVmAddPackageMessage
  | RawVmRunMessage;

export interface RawTx {
  msg: RawTxMessageType[];
  fee: { gas_wanted: string; gas_fee: string };
  signatures: {
    pub_key: {
      '@type': string;
      value: string;
    };
    signature: string;
  }[];
  memo: string;
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

  try {
    const document = rawTx as RawTx;
    const messages: Any[] = document.msg
      .map((msg) => ({
        type: msg['@type'],
        value: { ...msg },
      }))
      .map(encodeMessageValue);
    return {
      messages,
      fee: TxFee.create({
        gasWanted: document.fee.gas_wanted,
        gasFee: document.fee.gas_fee,
      }),
      signatures: document.signatures.map((signature) => {
        const publicKeyBytes = fromBase64(signature?.pub_key?.value || '');
        const wrappedPublicKeyValue: PubKeySecp256k1 = {
          key: publicKeyBytes,
        };
        const publicKeyTypeUrl = signature?.pub_key['@type'] || '';
        const encodedPublicKeyBytes = PubKeySecp256k1.encode(wrappedPublicKeyValue).finish();
        const signatureBytes = fromBase64(signature?.signature || '');
        return TxSignature.create({
          pubKey: {
            typeUrl: publicKeyTypeUrl,
            value: encodedPublicKeyBytes,
          },
          signature: signatureBytes,
        });
      }),
      memo: document.memo,
    };
  } catch (e) {
    console.error(e);
    return null;
  }
};
