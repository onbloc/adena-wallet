export interface NetworkInfo {
  nodeInfo: {
    versionSet: Array<{
      name: string;
      version: string;
      optional: boolean;
    }>;
    netAddress: string;
    network: string;
    software: string;
    version: string;
    channels: string;
    moniker: string;
    other: {
      txIndex: string;
      rpcAddress: string;
    };
  };

  syncInfo: {
    latestBlockHash: string;
    latestAppHash: string;
    latestBlockHeight: string;
    latestBlockTime: string;
    catchingUp: boolean;
  };

  validatorInfo: {
    address: string;
    pubKey: {
      type: string;
      value: string;
    };
    votingPower: string;
  };
}
