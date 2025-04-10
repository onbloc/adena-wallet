import { BinaryReader } from '@bufbuild/protobuf/wire';
import { ABCIResponse, RPCRequest, RPCResponse } from '@gnolang/tm2-js-client';

export const parseProto = <T>(
  data: string | Uint8Array,
  decodeFn: (input: BinaryReader | Uint8Array, length?: number) => T,
): T => {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;
  const protoData = decodeFn(buffer);

  return protoData;
};

export const fetchABCIResponse = async (
  url: string,
  withCache?: boolean,
): Promise<RPCResponse<ABCIResponse>> => {
  const response = await fetch(url, {
    cache: withCache ? 'force-cache' : 'default',
  });
  const data = await response.json();
  return data;
};

export const postABCIResponse = async (
  url: string,
  body: RPCRequest,
): Promise<RPCResponse<ABCIResponse>> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return data;
};

export const makeRequestQueryPath = (baseUrl: string, path: string, data: string): string => {
  const requestUri = `${baseUrl}/abci_query?path="${path}"&data="${data}"`;

  if (baseUrl.startsWith('http') || baseUrl.startsWith('https')) {
    return requestUri;
  }

  const isLocal = baseUrl.startsWith('localhost') || baseUrl.startsWith('127.0.0.1');
  const protocol = isLocal ? 'http' : 'https';

  return `${protocol}://${requestUri}`;
};
