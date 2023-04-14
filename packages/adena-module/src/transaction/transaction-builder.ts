import protobuf from 'protobufjs';
import { StdSignature, StdSignDoc } from '..';
import {
  BankSend,
  encodeBankSend,
  encodeVmAddPackage,
  encodeVmCall,
  VmAddPackage,
  VmCall,
} from './message-info';
import {
  MessageTypeUrl,
  Transaction,
  TransactionFee,
  TransactionMessage,
  TransactionSignature,
} from './transaction';

export class TransactionBuilder {
  private transaction: Transaction;

  constructor() {
    this.transaction = new Transaction();
  }

  public signatures = (signatures: Array<StdSignature>): TransactionBuilder => {
    const encodedSignatures: Array<TransactionSignature> = signatures.map((signature) => {
      return {
        pubKey: {
          typeUrl: signature.pub_key.type,
          value: TransactionBuilder.generateEncodedPublicKey(signature.pub_key.value as string),
        },
        signature: Buffer.from(signature.signature as string, 'base64'),
      };
    });
    this.transaction.setSignatures(encodedSignatures);
    return this;
  };

  public fee = (fee: TransactionFee): TransactionBuilder => {
    this.transaction.setFee(fee);
    return this;
  };

  public messages = (messages: Array<TransactionMessage>) => {
    const encodedMessages = messages.map((message) => {
      return {
        type: message.type,
        value: TransactionBuilder.generateEncodedMessageInfo(message),
      };
    });
    this.transaction.setMessages(encodedMessages);
    return this;
  };

  public memo = (memo: string): TransactionBuilder => {
    this.transaction.setMemeo(memo);
    return this;
  };

  public signDoucment = (signDoucment: StdSignDoc) => {
    const messages = signDoucment.msgs.map((message) => {
      return {
        type: message.type,
        value: TransactionBuilder.generateEncodedMessageInfo({
          type: message.type as MessageTypeUrl,
          value: message.value,
        }),
      };
    });
    const fee: TransactionFee = {
      gasFee: `${signDoucment.fee.amount[0].amount}${signDoucment.fee.amount[0].denom}`,
      gasWanted: signDoucment.fee.gas,
    };
    const memo = signDoucment.memo;
    this.transaction.setMessages(messages);
    this.transaction.setFee(fee);
    this.transaction.setMemeo(memo);
    return this;
  };

  public static builder = (): TransactionBuilder => {
    return new TransactionBuilder();
  };

  public build = (): Transaction => {
    return this.transaction;
  };

  private static generateEncodedPublicKey = (key: string): Uint8Array => {
    let writer: protobuf.Writer = protobuf.Writer.create();
    if (key.length !== 0) {
      writer.uint32(10).bytes(key);
    }
    return writer.finish();
  };

  private static generateEncodedMessageInfo = (message: TransactionMessage) => {
    let writer: protobuf.Writer = protobuf.Writer.create();
    let messageInfo;

    switch (message.type) {
      case '/bank.MsgSend':
        messageInfo = message.value as BankSend;
        encodeBankSend(writer, messageInfo);
        break;
      case '/vm.m_call':
        messageInfo = message.value as VmCall;
        encodeVmCall(writer, messageInfo);
        break;
      case '/vm.m_addpkg':
        messageInfo = message.value as VmAddPackage;
        encodeVmAddPackage(writer, messageInfo);
        break;
      default:
        throw new Error('Not Found Transaction Message Type');
    }
    return writer.finish();
  };
}
