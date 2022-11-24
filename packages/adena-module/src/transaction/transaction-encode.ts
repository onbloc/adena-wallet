import { TransactionEncodedMessage, TransactionFee, TransactionSignature } from './transaction';
import protobuf from 'protobufjs';
import Long from 'long';

export class TransactionEncode {
  public static messages = (
    writer: protobuf.Writer,
    messages: Array<TransactionEncodedMessage>,
  ) => {
    messages.forEach((message) =>
      TransactionEncode.message(writer.uint32(10).fork(), message).ldelim(),
    );
    return writer;
  };

  public static fee = (writer: protobuf.Writer, fee: TransactionFee) => {
    writer = writer.uint32(18).fork();

    if (fee.gasWanted !== 0) {
      writer.uint32(8).sint64(Long.fromNumber(fee.gasWanted));
    }
    if (fee.gasFee !== '') {
      writer.uint32(18).string(fee.gasFee);
    }
    return writer;
  };

  public static signatures = (writer: protobuf.Writer, signatures: Array<TransactionSignature>) => {
    signatures.forEach((signature) =>
      TransactionEncode.signature(writer.uint32(26).fork(), signature).ldelim(),
    );
    return writer;
  };

  public static memo = (writer: protobuf.Writer, memo: string) => {
    writer.uint32(34).string(memo);
    return writer;
  };

  private static message = (writer: protobuf.Writer, message: TransactionEncodedMessage) => {
    writer.uint32(10).string(message.type);
    if (message.value.length !== 0) {
      writer.uint32(18).bytes(message.value);
    }
    return writer;
  };

  private static signature = (writer: protobuf.Writer, signature: TransactionSignature) => {
    if (signature.pubKey !== undefined) {
      TransactionEncode.signaturePublicKey(writer.uint32(10).fork(), signature.pubKey).ldelim();
    }
    if (signature.signature.length !== 0) {
      writer.uint32(18).bytes(signature.signature);
    }
    return writer;
  };

  private static signaturePublicKey = (
    writer: protobuf.Writer,
    messege: {
      typeUrl: string;
      value: string | Uint8Array;
    },
  ) => {
    if (messege.typeUrl !== '') {
      writer.uint32(10).string(messege.typeUrl);
    }
    if (messege.value.length !== 0) {
      writer.uint32(18).bytes(messege.value);
    }
    return writer;
  };
}
