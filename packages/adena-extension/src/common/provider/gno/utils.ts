import { BinaryReader } from '@bufbuild/protobuf/wire';

const HTTP_PROTOCOL = 'http';
const HTTPS_PROTOCOL = 'https';
const HTTP_PROTOCOL_PREFIX = `${HTTP_PROTOCOL}://`;
const HTTPS_PROTOCOL_PREFIX = `${HTTPS_PROTOCOL}://`;

export const parseProto = <T>(
  data: string | Uint8Array,
  decodeFn: (input: BinaryReader | Uint8Array, length?: number) => T,
): T => {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;
  const protoData = decodeFn(buffer);

  return protoData;
};

export const hasHttpProtocol = (domain: string): boolean => {
  return isHttpProtocol(domain) || isHttpsProtocol(domain);
};

export const isHttpsProtocol = (domain: string): boolean => {
  return domain.startsWith(HTTPS_PROTOCOL_PREFIX);
};

export const isHttpProtocol = (domain: string): boolean => {
  return domain.startsWith(HTTP_PROTOCOL_PREFIX);
};

export const isInterRealmParameter = (name: string, type: string): boolean => {
  return type === 'realm';
};
