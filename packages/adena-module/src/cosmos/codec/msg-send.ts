import { AminoMsg } from '@cosmjs/amino';
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx';
import { Any } from 'cosmjs-types/google/protobuf/any';

export const MSG_SEND_TYPE_URL = '/cosmos.bank.v1beta1.MsgSend';
export const MSG_SEND_AMINO_TYPE = 'cosmos-sdk/MsgSend';

export interface MsgSendAminoValue {
  from_address: string;
  to_address: string;
  amount: { denom: string; amount: string }[];
}

export function msgSendToAmino(proto: MsgSend): AminoMsg {
  return {
    type: MSG_SEND_AMINO_TYPE,
    value: {
      from_address: proto.fromAddress,
      to_address: proto.toAddress,
      amount: proto.amount.map((c) => ({ denom: c.denom, amount: c.amount })),
    } satisfies MsgSendAminoValue,
  };
}

export function msgSendFromAmino(amino: AminoMsg): MsgSend {
  if (amino.type !== MSG_SEND_AMINO_TYPE) {
    throw new Error(`Expected ${MSG_SEND_AMINO_TYPE}, got ${amino.type}`);
  }
  const v = amino.value as MsgSendAminoValue;
  return MsgSend.fromPartial({
    fromAddress: v.from_address,
    toAddress: v.to_address,
    amount: v.amount,
  });
}

export function msgSendToAny(proto: MsgSend): Any {
  return Any.fromPartial({
    typeUrl: MSG_SEND_TYPE_URL,
    value: MsgSend.encode(proto).finish(),
  });
}
