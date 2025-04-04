import { BinaryReader } from '@bufbuild/protobuf/wire';

export const parseProto = <T>(
  data: string | Uint8Array,
  decodeFn: (input: BinaryReader | Uint8Array, length?: number) => T,
): T => {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;
  const protoData = decodeFn(buffer);

  return protoData;
};
