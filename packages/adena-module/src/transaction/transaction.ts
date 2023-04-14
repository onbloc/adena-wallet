import { Document } from '../amino/document';
import { Keyring } from '../wallet/keyring';
import protobuf from 'protobufjs/minimal';
import { StdSignDoc } from '..';
import { TransactionEncode } from './transaction-encode';

export type MessageTypeUrl = '/vm.m_call' | '/vm.m_addpkg' | '/bank.MsgSend';

export interface TransactionMessage {
  type: MessageTypeUrl;
  value: { [key in string]: any };
}

export interface TransactionEncodedMessage {
  type: string;
  value: Uint8Array;
}

export interface TransactionFee {
  gasWanted: string;
  gasFee: string;
}

export interface TransactionSignature {
  pubKey: {
    typeUrl: string;
    value: string | Uint8Array;
  };
  signature: string | Uint8Array;
}

export class Transaction {
  private signatures: Array<TransactionSignature> | undefined;
  private fee: TransactionFee | undefined;
  private messages: Array<TransactionEncodedMessage> | undefined;
  private memo: string;

  constructor() {
    this.memo = '';
  }

  public get encodedValue() {
    const writer = protobuf.Writer.create();
    if (this.messages) {
      TransactionEncode.messages(writer, this.messages);
    }

    if (this.fee) {
      TransactionEncode.fee(writer, this.fee).ldelim();
    }

    if (this.signatures) {
      TransactionEncode.signatures(writer, this.signatures);
    }

    if (this.memo) {
      TransactionEncode.memo(writer, this.memo);
    }

    const transactionValue = writer.finish();

    return transactionValue;
  }

  public setSignatures = (signatures: Array<TransactionSignature>) => {
    this.signatures = [...signatures];
  };

  public setFee = (fee: TransactionFee) => {
    this.fee = fee;
  };

  public setMessages = (messages: Array<TransactionEncodedMessage>) => {
    this.messages = [...messages];
  };

  public setMemeo = (memo: string) => {
    this.memo = memo;
  };

  public static generateTransactionFee = (gasWanted: string, gasFee?: string): TransactionFee => {
    return {
      gasFee: gasFee ?? '1ugnot',
      gasWanted,
    };
  };

  public static generateDocument = (
    accountNumber: string,
    sequence: string,
    chainId: string,
    messages: Array<any>,
    gasWanted: string,
    gasFee: {
      value: string;
      denom: string;
    },
    memo?: string,
  ): StdSignDoc => {
    return Document.createDocument(
      accountNumber,
      sequence,
      chainId,
      messages,
      gasWanted,
      gasFee,
      memo ?? '',
    );
  };

  public static generateSignature = async (keyring: Keyring, documnet: StdSignDoc) => {
    const signedResult = await keyring.sign(documnet);
    const { signature } = signedResult;
    return signature;
  };
}
