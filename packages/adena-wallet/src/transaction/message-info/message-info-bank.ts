import { InfoType } from './message-info-type';
import protobuf from 'protobufjs';

export interface BankSend extends InfoType {
  from_address: string;
  to_address: string;
  amount: string;
}

export const encodeBankSend = (writer: protobuf.Writer, messageInfo: BankSend) => {
  if (messageInfo.from_address !== '') {
    writer.uint32(10).string(messageInfo.from_address);
  }
  if (messageInfo.to_address !== '') {
    writer.uint32(18).string(messageInfo.to_address);
  }
  if (messageInfo.amount !== '') {
    writer.uint32(26).string(messageInfo.amount);
  }
  return writer;
};
