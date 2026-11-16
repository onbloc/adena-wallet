import axios from 'axios';
import { v1 } from 'uuid';

export interface RPCRequest {
  id: string;
  jsonrpc: string;
  method: string;
  params: any[];
}

export interface IndexerRPCRequest {
  id: number;
  jsonrpc: string;
  method: string;
  params: any[];
}

// With a fallbackUrl the network only counts as unresponsive once neither
// endpoint answers, matching the provider's failover.
export async function fetchHealth(
  url: string,
  fallbackUrl?: string,
): Promise<{ url: string; healthy: boolean }> {
  const healthy = await isEndpointHealthy(url);
  if (healthy || !fallbackUrl || fallbackUrl === url) {
    return { url, healthy };
  }

  return {
    url: fallbackUrl,
    healthy: await isEndpointHealthy(fallbackUrl),
  };
}

async function isEndpointHealthy(url: string): Promise<boolean> {
  return axios
    .get(url + '/health', { timeout: 5000 })
    .then((response) => response.status === 200)
    .catch(() => false);
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

export function makeIndexerRPCRequest({
  id,
  method,
  params,
}: {
  id?: number;
  method: string;
  params?: any[];
}): IndexerRPCRequest {
  return {
    id: id || makeRandId(),
    jsonrpc: '2.0',
    method: method,
    params: params || [],
  };
}

function makeRandId(): number {
  return Math.floor(Math.random() * 10 ** 16);
}
