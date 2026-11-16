import CHAIN_DATA from '@resources/chains/chains.json';

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
