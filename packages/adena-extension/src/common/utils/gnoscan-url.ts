import CHAIN_DATA from '@resources/chains/chains.json';
import { fromHex, toBase64 } from 'adena-module';

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

const GNOSCAN_CHAIN_IDS = new Set(
  CHAIN_DATA.filter((chain) => !!chain.default && chain.chainId !== 'dev').map(
    (chain) => chain.chainId,
  ),
);

export const getGnoscanChainId = (networkId: string): string => {
  return CHAIN_DATA.find((chain) => chain.chainId === networkId)?.chainId ?? networkId;
};

export const isGnoscanChainIdSupported = (networkId: string): boolean => {
  return GNOSCAN_CHAIN_IDS.has(networkId);
};

export const getGnoscanChainParameters = (networkId: string): { chainId: string } | null => {
  if (!isGnoscanChainIdSupported(networkId)) {
    return null;
  }

  return {
    chainId: getGnoscanChainId(networkId),
  };
};
