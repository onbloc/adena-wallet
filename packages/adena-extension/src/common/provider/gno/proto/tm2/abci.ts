// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v2.2.0
//   protoc               v5.29.0
// source: tm2/abci.proto

/* eslint-disable */
import { BinaryReader, BinaryWriter } from '@bufbuild/protobuf/wire';
import Long from 'long';
import { Any } from '../google/any';

export const protobufPackage = 'tm2.abci';

export interface ResponseDeliverTx {
  responseBase?: ResponseBase | undefined;
  gasWanted: Long;
  gasUsed: Long;
}

export interface ResponseBase {
  error?: Any | undefined;
  data: Uint8Array;
  events: Any[];
  log: string;
  info: string;
}

function createBaseResponseDeliverTx(): ResponseDeliverTx {
  return { responseBase: undefined, gasWanted: Long.ZERO, gasUsed: Long.ZERO };
}

export const ResponseDeliverTx: MessageFns<ResponseDeliverTx> = {
  encode(message: ResponseDeliverTx, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.responseBase !== undefined) {
      ResponseBase.encode(message.responseBase, writer.uint32(10).fork()).join();
    }
    if (!message.gasWanted.equals(Long.ZERO)) {
      writer.uint32(16).sint64(message.gasWanted.toString());
    }
    if (!message.gasUsed.equals(Long.ZERO)) {
      writer.uint32(24).sint64(message.gasUsed.toString());
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): ResponseDeliverTx {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseDeliverTx();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.responseBase = ResponseBase.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.gasWanted = Long.fromString(reader.sint64().toString());
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.gasUsed = Long.fromString(reader.sint64().toString());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ResponseDeliverTx {
    return {
      responseBase: isSet(object.ResponseBase)
        ? ResponseBase.fromJSON(object.ResponseBase)
        : undefined,
      gasWanted: isSet(object.GasWanted) ? Long.fromValue(object.GasWanted) : Long.ZERO,
      gasUsed: isSet(object.GasUsed) ? Long.fromValue(object.GasUsed) : Long.ZERO,
    };
  },

  toJSON(message: ResponseDeliverTx): unknown {
    const obj: any = {};
    if (message.responseBase !== undefined) {
      obj.ResponseBase = ResponseBase.toJSON(message.responseBase);
    }
    if (message.gasWanted !== undefined) {
      obj.GasWanted = (message.gasWanted || Long.ZERO).toString();
    }
    if (message.gasUsed !== undefined) {
      obj.GasUsed = (message.gasUsed || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ResponseDeliverTx>, I>>(base?: I): ResponseDeliverTx {
    return ResponseDeliverTx.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ResponseDeliverTx>, I>>(object: I): ResponseDeliverTx {
    const message = createBaseResponseDeliverTx();
    message.responseBase =
      object.responseBase !== undefined && object.responseBase !== null
        ? ResponseBase.fromPartial(object.responseBase)
        : undefined;
    message.gasWanted =
      object.gasWanted !== undefined && object.gasWanted !== null
        ? Long.fromValue(object.gasWanted)
        : Long.ZERO;
    message.gasUsed =
      object.gasUsed !== undefined && object.gasUsed !== null
        ? Long.fromValue(object.gasUsed)
        : Long.ZERO;
    return message;
  },
};

function createBaseResponseBase(): ResponseBase {
  return {
    error: undefined,
    data: new Uint8Array(0),
    events: [],
    log: '',
    info: '',
  };
}

export const ResponseBase: MessageFns<ResponseBase> = {
  encode(message: ResponseBase, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.error !== undefined) {
      Any.encode(message.error, writer.uint32(10).fork()).join();
    }
    if (message.data.length !== 0) {
      writer.uint32(18).bytes(message.data);
    }
    for (const v of message.events) {
      Any.encode(v!, writer.uint32(26).fork()).join();
    }
    if (message.log !== '') {
      writer.uint32(34).string(message.log);
    }
    if (message.info !== '') {
      writer.uint32(42).string(message.info);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): ResponseBase {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseBase();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.error = Any.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.data = reader.bytes();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.events.push(Any.decode(reader, reader.uint32()));
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.log = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.info = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ResponseBase {
    return {
      error: isSet(object.Error) ? Any.fromJSON(object.Error) : undefined,
      data: isSet(object.Data) ? bytesFromBase64(object.Data) : new Uint8Array(0),
      events: globalThis.Array.isArray(object?.Events)
        ? object.Events.map((e: any) => Any.fromJSON(e))
        : [],
      log: isSet(object.Log) ? globalThis.String(object.Log) : '',
      info: isSet(object.Info) ? globalThis.String(object.Info) : '',
    };
  },

  toJSON(message: ResponseBase): unknown {
    const obj: any = {};
    if (message.error !== undefined) {
      obj.Error = Any.toJSON(message.error);
    }
    if (message.data !== undefined) {
      obj.Data = base64FromBytes(message.data);
    }
    if (message.events?.length) {
      obj.Events = message.events.map((e) => Any.toJSON(e));
    }
    if (message.log !== undefined) {
      obj.Log = message.log;
    }
    if (message.info !== undefined) {
      obj.Info = message.info;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ResponseBase>, I>>(base?: I): ResponseBase {
    return ResponseBase.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ResponseBase>, I>>(object: I): ResponseBase {
    const message = createBaseResponseBase();
    message.error =
      object.error !== undefined && object.error !== null
        ? Any.fromPartial(object.error)
        : undefined;
    message.data = object.data ?? new Uint8Array(0);
    message.events = object.events?.map((e) => Any.fromPartial(e)) || [];
    message.log = object.log ?? '';
    message.info = object.info ?? '';
    return message;
  },
};

function bytesFromBase64(b64: string): Uint8Array {
  if ((globalThis as any).Buffer) {
    return Uint8Array.from(globalThis.Buffer.from(b64, 'base64'));
  } else {
    const bin = globalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
}

function base64FromBytes(arr: Uint8Array): string {
  if ((globalThis as any).Buffer) {
    return globalThis.Buffer.from(arr).toString('base64');
  } else {
    const bin: string[] = [];
    arr.forEach((byte) => {
      bin.push(globalThis.String.fromCharCode(byte));
    });
    return globalThis.btoa(bin.join(''));
  }
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Long
    ? string | number | Long
    : T extends globalThis.Array<infer U>
      ? globalThis.Array<DeepPartial<U>>
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<DeepPartial<U>>
        : T extends {}
          ? { [K in keyof T]?: DeepPartial<T[K]> }
          : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin
  ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & {
      [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
    };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}

export interface MessageFns<T> {
  encode(message: T, writer?: BinaryWriter): BinaryWriter;
  decode(input: BinaryReader | Uint8Array, length?: number): T;
  fromJSON(object: any): T;
  toJSON(message: T): unknown;
  create<I extends Exact<DeepPartial<T>, I>>(base?: I): T;
  fromPartial<I extends Exact<DeepPartial<T>, I>>(object: I): T;
}