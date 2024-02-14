import { Any, Tx, TxFee, TxSignature } from '@gnolang/tm2-js-client';
import { MsgCall, MsgAddPackage, MsgSend, MsgEndpoint } from '@gnolang/gno-js-client';
import { MemPackage, MemFile, MsgRun } from '@gnolang/gno-js-client/bin/proto/gno/vm';

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
      return Any.create({
        typeUrl: MsgEndpoint.MSG_CALL,
        value: MsgCall.encode(MsgCall.fromJSON(message.value)).finish(),
      });
    }
    case MsgEndpoint.MSG_SEND: {
      return Any.create({
        typeUrl: MsgEndpoint.MSG_SEND,
        value: MsgSend.encode(MsgSend.fromJSON(message.value)).finish(),
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
      signatures: rawTx.signatures.map(TxSignature.fromJSON),
      memo: document.memo,
    };
  } catch (e) {
    console.error(e);
    return null;
  }
};
