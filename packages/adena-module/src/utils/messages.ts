import { Any, Tx, TxFee, TxSignature } from '@gnolang/tm2-js-client';
import { MsgCall, MsgAddPackage, MsgSend, MsgEndpoint } from '@gnolang/gno-js-client';

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

function encodeMessageValue(message: { type: string; value: any }) {
  switch (message.type) {
    case MsgEndpoint.MSG_ADD_PKG:
      const value = message.value;
      const msgAddPkg = MsgAddPackage.create(value);
      return {
        typeUrl: MsgEndpoint.MSG_ADD_PKG,
        value: MsgAddPackage.encode(msgAddPkg).finish(),
      };
    case MsgEndpoint.MSG_CALL:
      return {
        typeUrl: MsgEndpoint.MSG_CALL,
        value: MsgCall.encode(message.value).finish(),
      };
    case MsgEndpoint.MSG_SEND:
      return {
        typeUrl: MsgEndpoint.MSG_SEND,
        value: MsgSend.encode(message.value).finish(),
      };
    default:
      return {
        typeUrl: MsgEndpoint.MSG_CALL,
        value: MsgCall.encode(message.value).finish(),
      };
  }
}

function sortedObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortedObject);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, any> = {};
  // NOTE: Use forEach instead of reduce for performance with large objects eg Wasm code
  sortedKeys.forEach((key) => {
    const lowerKey = key.toLowerCase();
    result[lowerKey] = sortedObject(obj[key]);
  });
  return result;
}

export function documentToTx(document: Document): Tx {
  const sortedDocument = sortedObject(document) as Document;
  const messages: Any[] = sortedDocument.msgs.map(encodeMessageValue);
  return {
    messages,
    fee: TxFee.create({
      gasWanted: sortedDocument.fee.gas,
      gasFee: sortedDocument.fee.amount
        .map((feeAmount) => `${feeAmount.amount}${feeAmount.denom}`)
        .join(','),
    }),
    signatures: [],
    memo: sortedDocument.memo,
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
    const sortedDocument = sortedObject(rawTx) as RawTx;
    const messages: Any[] = sortedDocument.msg
      .map((msg) => ({
        type: msg['@type'],
        value: { ...msg },
      }))
      .map(encodeMessageValue);
    return {
      messages,
      fee: TxFee.create({
        gasWanted: sortedDocument.fee.gas_wanted,
        gasFee: sortedDocument.fee.gas_fee,
      }),
      signatures: rawTx.signatures.map((signature: any) =>
        TxSignature.fromJSON({
          ...signature,
          pubKey: {
            ...signature.pub_key,
            typeUrl: signature.pub_key['@type'],
          },
        }),
      ),
      memo: sortedDocument.memo,
    };
  } catch (e) {
    console.error(e);
    return null;
  }
};
