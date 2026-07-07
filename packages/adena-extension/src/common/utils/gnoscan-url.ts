import { fromHex, toBase64 } from 'adena-module';

const GNOSCAN_CHAIN_ID_BY_NETWORK_ID: Record<string, string> = {
  'test-13': 'testnet-13',
};

// A broadcast RPC response returns the tx hash as a 64-char hex string, whereas
// Gnoscan (and the indexer) key transactions by the base64-encoded hash. Convert
// a hex hash to base64 and pass any already-base64 value through unchanged.
const HEX_TX_HASH_PATTERN = /^[0-9a-fA-F]{64}$/;

export const normalizeGnoscanTxHash = (txHash: string): string => {
  if (!HEX_TX_HASH_PATTERN.test(txHash)) {
    return txHash;
  }

  return toBase64(fromHex(txHash));
};

const GNOSCAN_CHAIN_IDS = new Set(['gnoland1', 'staging', 'test-13', 'testnet-13']);

export const getGnoscanChainId = (networkId: string): string => {
  return GNOSCAN_CHAIN_ID_BY_NETWORK_ID[networkId] ?? networkId;
};

export const isGnoscanChainIdSupported = (networkId: string): boolean => {
  return GNOSCAN_CHAIN_IDS.has(networkId);
};

export const getGnoscanChainParameters = (
  networkId: string,
): { chainId: string } | null => {
  if (!isGnoscanChainIdSupported(networkId)) {
    return null;
  }

  return {
    chainId: getGnoscanChainId(networkId),
  };
};
