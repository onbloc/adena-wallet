import { AminoMsg } from '@cosmjs/amino';
import { Any } from 'cosmjs-types/google/protobuf/any';

import * as MsgSendCodec from './msg-send';

export interface MessageCodec<Proto> {
  typeUrl: string;
  aminoType: string;
  toAmino: (proto: Proto) => AminoMsg;
  fromAmino: (amino: AminoMsg) => Proto;
  toAny: (proto: Proto) => Any;
}

// Central lookup keyed by AMINO type name. Extend this map when adding
// new Cosmos messages (e.g. MsgTransfer in the IBC phase, MsgMintPhoton later).
const codecs: Record<string, MessageCodec<unknown>> = {
  [MsgSendCodec.MSG_SEND_AMINO_TYPE]: {
    typeUrl: MsgSendCodec.MSG_SEND_TYPE_URL,
    aminoType: MsgSendCodec.MSG_SEND_AMINO_TYPE,
    toAmino: MsgSendCodec.msgSendToAmino as (p: unknown) => AminoMsg,
    fromAmino: MsgSendCodec.msgSendFromAmino as (a: AminoMsg) => unknown,
    toAny: MsgSendCodec.msgSendToAny as (p: unknown) => Any,
  },
};

export function getCodecByAminoType(aminoType: string): MessageCodec<unknown> {
  const codec = codecs[aminoType];
  if (!codec) {
    throw new Error(`Unknown amino message type: ${aminoType}`);
  }
  return codec;
}

export function hasCodecForAminoType(aminoType: string): boolean {
  return Object.prototype.hasOwnProperty.call(codecs, aminoType);
}
