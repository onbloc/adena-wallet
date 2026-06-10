const GNOSCAN_CHAIN_ID_BY_NETWORK_ID: Record<string, string> = {
  'test-13': 'testnet-13',
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
