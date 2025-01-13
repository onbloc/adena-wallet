import { BinaryReader } from '@bufbuild/protobuf/wire';

export const parseProto = <T>(
  data: string,
  decodeFn: (input: BinaryReader | Uint8Array, length?: number) => T,
): T => {
  const protoData = decodeFn(Buffer.from(data, 'base64'));

  return protoData;
};
