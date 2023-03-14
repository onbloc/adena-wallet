import protobuf from 'protobufjs/minimal';
import { TransactionEncode } from './transaction-encode';
import { WalletAccount } from '../wallet';
import { Document, StdSignDoc } from '../amino';

type MessageTypeUrl = '/vm.m_call' | '/vm.m_addpkg' | '/bank.MsgSend';

export interface TransactionMessage {
  type: MessageTypeUrl;
  value: { [key in string]: any };
}

export interface TransactionEncodedMessage {
  type: MessageTypeUrl;
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

  public static generateTransactionFee = (
    gasWanted: string,
    gasFee?: string,
  ): TransactionFee => {
    return {
      gasFee: gasFee ?? '1ugnot',
      gasWanted,
    };
  };

  public static generateDocument = (
    account: WalletAccount,
    chainId: string,
    messages: Array<any>,
    gasWanted: string,
    gasFee: {
      value: string,
      denom: string
    },
    memo?: string
  ): StdSignDoc => {

    return Document.createDocument(account, chainId, messages, gasWanted, gasFee, memo ?? "");
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
}
