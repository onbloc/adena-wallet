/* eslint-disable */
// Vendored from gno-js-client PR #247.
// When gno-js-client >= X.X.X ships, replace this file with the official package export.
import Long from 'long';
import { BinaryReader, BinaryWriter } from '@bufbuild/protobuf/wire';
import { Any } from '@gnolang/tm2-js-client/bin/proto/google/protobuf/any';

export const protobufPackage = 'gno.auth';

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
  const message = Any.create();
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

export interface MsgCreateSession {
  creator: string;
  session_key?: Any;
  expires_at: Long;
  allow_paths: string[];
  spend_limit: string;
  spend_period: Long;
}

export interface MsgRevokeSession {
  creator: string;
  session_key?: Any;
}

export interface MsgRevokeAllSessions {
  creator: string;
}

function createBaseMsgCreateSession(): MsgCreateSession {
  return {
    creator: '',
    session_key: undefined,
    expires_at: Long.ZERO,
    allow_paths: [],
    spend_limit: '',
    spend_period: Long.ZERO,
  };
}

export const MsgCreateSession: MessageFns<MsgCreateSession> = {
  encode(message: MsgCreateSession, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.creator !== '') {
      writer.uint32(10).string(message.creator);
    }
    if (message.session_key !== undefined) {
      encodeAny(message.session_key, writer.uint32(18).fork()).join();
    }
    if (!message.expires_at.isZero()) {
      writer.uint32(24).sint64(message.expires_at.toString());
    }
    for (const v of message.allow_paths) {
      writer.uint32(34).string(v);
    }
    if (message.spend_limit !== '') {
      writer.uint32(42).string(message.spend_limit);
    }
    if (!message.spend_period.isZero()) {
      writer.uint32(48).sint64(message.spend_period.toString());
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateSession {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCreateSession();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }
          message.creator = reader.string();
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }
          message.session_key = decodeAny(reader, reader.uint32());
          continue;
        }
        case 3: {
          if (tag !== 24) {
            break;
          }
          message.expires_at = Long.fromString(String(reader.sint64()));
          continue;
        }
        case 4: {
          if (tag !== 34) {
            break;
          }
          message.allow_paths.push(reader.string());
          continue;
        }
        case 5: {
          if (tag !== 42) {
            break;
          }
          message.spend_limit = reader.string();
          continue;
        }
        case 6: {
          if (tag !== 48) {
            break;
          }
          message.spend_period = Long.fromString(String(reader.sint64()));
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

  fromJSON(object: any): MsgCreateSession {
    return {
      creator: object.creator ?? '',
      session_key: object.session_key != null ? Any.fromJSON(object.session_key) : undefined,
      expires_at: object.expires_at != null ? Long.fromValue(object.expires_at) : Long.ZERO,
      allow_paths: Array.isArray(object?.allow_paths) ? object.allow_paths.map(String) : [],
      spend_limit: object.spend_limit ?? '',
      spend_period: object.spend_period != null ? Long.fromValue(object.spend_period) : Long.ZERO,
    };
  },

  toJSON(message: MsgCreateSession): unknown {
    const obj: any = {};
    if (message.creator !== '') obj.creator = message.creator;
    if (message.session_key !== undefined) obj.session_key = Any.toJSON(message.session_key);
    if (!message.expires_at.isZero())
      obj.expires_at = (message.expires_at || Long.ZERO).toString();
    if (message.allow_paths.length) obj.allow_paths = message.allow_paths;
    if (message.spend_limit !== '') obj.spend_limit = message.spend_limit;
    if (!message.spend_period.isZero())
      obj.spend_period = (message.spend_period || Long.ZERO).toString();
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgCreateSession>, I>>(base?: I): MsgCreateSession {
    return MsgCreateSession.fromPartial(base ?? ({} as any));
  },

  fromPartial<I extends Exact<DeepPartial<MsgCreateSession>, I>>(object: I): MsgCreateSession {
    const message = createBaseMsgCreateSession();
    message.creator = object.creator ?? '';
    message.session_key =
      object.session_key !== undefined && object.session_key !== null
        ? Any.fromPartial(object.session_key)
        : undefined;
    message.expires_at =
      object.expires_at != null ? Long.fromValue(object.expires_at as Long) : Long.ZERO;
    message.allow_paths = object.allow_paths?.map((e) => e) || [];
    message.spend_limit = object.spend_limit ?? '';
    message.spend_period =
      object.spend_period != null ? Long.fromValue(object.spend_period as Long) : Long.ZERO;
    return message;
  },
};

function createBaseMsgRevokeSession(): MsgRevokeSession {
  return { creator: '', session_key: undefined };
}

export const MsgRevokeSession: MessageFns<MsgRevokeSession> = {
  encode(message: MsgRevokeSession, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.creator !== '') {
      writer.uint32(10).string(message.creator);
    }
    if (message.session_key !== undefined) {
      encodeAny(message.session_key, writer.uint32(18).fork()).join();
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): MsgRevokeSession {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRevokeSession();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }
          message.creator = reader.string();
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }
          message.session_key = decodeAny(reader, reader.uint32());
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

  fromJSON(object: any): MsgRevokeSession {
    return {
      creator: object.creator ?? '',
      session_key: object.session_key != null ? Any.fromJSON(object.session_key) : undefined,
    };
  },

  toJSON(message: MsgRevokeSession): unknown {
    const obj: any = {};
    if (message.creator !== '') obj.creator = message.creator;
    if (message.session_key !== undefined) obj.session_key = Any.toJSON(message.session_key);
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgRevokeSession>, I>>(base?: I): MsgRevokeSession {
    return MsgRevokeSession.fromPartial(base ?? ({} as any));
  },

  fromPartial<I extends Exact<DeepPartial<MsgRevokeSession>, I>>(object: I): MsgRevokeSession {
    const message = createBaseMsgRevokeSession();
    message.creator = object.creator ?? '';
    message.session_key =
      object.session_key !== undefined && object.session_key !== null
        ? Any.fromPartial(object.session_key)
        : undefined;
    return message;
  },
};

function createBaseMsgRevokeAllSessions(): MsgRevokeAllSessions {
  return { creator: '' };
}

export const MsgRevokeAllSessions: MessageFns<MsgRevokeAllSessions> = {
  encode(
    message: MsgRevokeAllSessions,
    writer: BinaryWriter = new BinaryWriter(),
  ): BinaryWriter {
    if (message.creator !== '') {
      writer.uint32(10).string(message.creator);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): MsgRevokeAllSessions {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRevokeAllSessions();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }
          message.creator = reader.string();
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

  fromJSON(object: any): MsgRevokeAllSessions {
    return { creator: object.creator ?? '' };
  },

  toJSON(message: MsgRevokeAllSessions): unknown {
    const obj: any = {};
    if (message.creator !== '') obj.creator = message.creator;
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgRevokeAllSessions>, I>>(base?: I): MsgRevokeAllSessions {
    return MsgRevokeAllSessions.fromPartial(base ?? ({} as any));
  },

  fromPartial<I extends Exact<DeepPartial<MsgRevokeAllSessions>, I>>(
    object: I,
  ): MsgRevokeAllSessions {
    const message = createBaseMsgRevokeAllSessions();
    message.creator = object.creator ?? '';
    return message;
  },
};

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

export interface MessageFns<T> {
  encode(message: T, writer?: BinaryWriter): BinaryWriter;
  decode(input: BinaryReader | Uint8Array, length?: number): T;
  fromJSON(object: any): T;
  toJSON(message: T): unknown;
  create<I extends Exact<DeepPartial<T>, I>>(base?: I): T;
  fromPartial<I extends Exact<DeepPartial<T>, I>>(object: I): T;
}
