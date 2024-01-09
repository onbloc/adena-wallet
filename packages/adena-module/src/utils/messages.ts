import { Any, Tx, TxFee } from '@gnolang/tm2-js-client';
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
      return {
        typeUrl: MsgEndpoint.MSG_ADD_PKG,
        value: MsgAddPackage.encode(message.value).finish(),
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
