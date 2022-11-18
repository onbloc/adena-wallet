import { TransactionBuilder } from './transaction-builder';
import protobuf from 'protobufjs/minimal';
import { TransactionMessageInfo, TransactionEncode } from '.';
import { WalletAccount, Document, StdSignDoc } from '..';

type MessageTypeUrl = '/vm.m_call' | '/vm.m_addpkg' | '/bank.MsgSend';

export interface TransactionMessage {
  type: MessageTypeUrl;
  value: TransactionMessageInfo.InfoType;
}

export interface TransactionEncodedMessage {
  type: MessageTypeUrl;
  value: Uint8Array;
}

export interface TransactionFee {
  gasWanted: number;
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
      TransactionEncode.memo(writer, this.memo).ldelim();
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

  public static generateTransactionFee = (
    account: WalletAccount,
    gasWanted: number,
    gasFee?: number,
  ): TransactionFee => {
    const gasFeeAmount = `${gasFee ?? 1}`;
    const minimalDenom = account.getConfig().getCoinMinimalDenom();
    return {
      gasFee: `${gasFeeAmount}${minimalDenom}`,
      gasWanted,
    };
  };

  public static generateDocument = (
    account: WalletAccount,
    message: any,
    gasWanted: number,
    gasFee?: number,
  ): StdSignDoc => {
    return Document.createDocument(account, message, gasWanted, gasFee);
  };

  public static generateSignature = async (
    account: WalletAccount,
    documnet: StdSignDoc,
  ): Promise<TransactionSignature> => {
    const signer = account.getSigner();
    if (!signer) {
      throw new Error("Not initialized account's signer");
    }
    const signedResult = await signer.signAmino(account.getAddress(), documnet);
    const { pub_key, signature } = signedResult.signature;

    return {
      pubKey: {
        typeUrl: '/tm.PubKeySecp256k1', //pub_key.type,
        value: pub_key.value,
      },
      signature: signature,
    };
  };

  public static builder = (): TransactionBuilder => {
    return new TransactionBuilder();
  };
}
