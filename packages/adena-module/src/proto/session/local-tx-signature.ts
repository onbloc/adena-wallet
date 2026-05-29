import { TxSignature } from '@gnolang/tm2-js-client';
import { BinaryReader, BinaryWriter } from '@bufbuild/protobuf/wire';
import type { Any } from '@gnolang/tm2-js-client/bin/proto/google/protobuf/any';

// Extends TxSignature with session_addr (field 3 from gno PR #5307 std.proto).
// Structurally compatible with TxSignature so it can be stored in TxSignature[].
export interface LocalTxSignature {
  pub_key?: Any;
  signature: Uint8Array;
  session_addr?: string;
}

function createBaseLocalTxSignature(): LocalTxSignature {
  return { pub_key: undefined, signature: new Uint8Array(0) };
}

function encodeAny(message: Any, writer: BinaryWriter): BinaryWriter {
  if (message.type_url !== '') {
    writer.uint32(10).string(message.type_url);
  }
  if (message.value.length !== 0) {
    writer.uint32(18).bytes(message.value);
  }
  return writer;
}

function decodeAny(reader: BinaryReader, length: number): Any {
  const end = reader.pos + length;
  const message: Any = { type_url: '', value: new Uint8Array(0) };
  while (reader.pos < end) {
    const tag = reader.uint32();
    switch (tag >>> 3) {
      case 1: {
        if (tag !== 10) {
          break;
        }
        message.type_url = reader.string();
        continue;
      }
      case 2: {
        if (tag !== 18) {
          break;
        }
        message.value = reader.bytes();
        continue;
      }
    }
    if ((tag & 7) === 4 || tag === 0) {
      break;
    }
    reader.skip(tag & 7);
  }
  return message;
}

export const LocalTxSignature = {
  encode(message: LocalTxSignature, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.pub_key !== undefined) {
      encodeAny(message.pub_key, writer.uint32(10).fork()).join();
    }
    if (message.signature.length !== 0) {
      writer.uint32(18).bytes(message.signature);
    }
    if (message.session_addr !== undefined && message.session_addr !== '') {
      writer.uint32(26).string(message.session_addr);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): LocalTxSignature {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLocalTxSignature();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }
          message.pub_key = decodeAny(reader, reader.uint32());
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }
          message.signature = reader.bytes();
          continue;
        }
        case 3: {
          if (tag !== 26) {
            break;
          }
          message.session_addr = reader.string();
          continue;
        }
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },
};

export function isLocalTxSignature(sig: TxSignature): sig is LocalTxSignature {
  return typeof (sig as LocalTxSignature).session_addr === 'string';
}
