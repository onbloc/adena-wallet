import axios from 'axios';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import { v1 } from 'uuid';

export interface RPCRequest {
  id: string;
  jsonrpc: string;
  method: string;
  params: any[];
}

export async function fetchHealth(url: string): Promise<{ url: string; healthy: boolean }> {
  const healthy = await axios
    .get(url + '/health', { adapter: fetchAdapter, timeout: 5000 })
    .then((response) => response.status === 200)
    .catch(() => false);
  return {
    url,
    healthy,
  };
}

export function makeRPCRequest({
  id,
  method,
  params,
}: {
  id?: string;
  method: string;
  params?: any[];
}): RPCRequest {
  return {
    id: id || v1().toString(),
    jsonrpc: '2.0',
    method: method,
    params: params || [],
  };
}
