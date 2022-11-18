export interface Genesis {
  genesisTime: string;
  chainId: string;
  consensusParams: {
    block: {
      maxTxBytes: string;
      maxDataBytes: string;
      maxBlockBytes: string;
      maxGas: string;
      timeIotaMs: string;
    };
    validator: {
      pubKeyTypeUrLs: Array<string>;
    };
  };
  validators: Array<{
    address: string;
    pubKey: {
      type: string;
      value: string;
    };
    power: string;
    name: string;
  }>;
  appHash: string | null;
  appState: {
    type: string;
    balances: Array<string>;
    txs: Array<{
      msg: Array<{
        type: string;
        creator: string;
        package: {
          name: string;
          path: string;
          files: Array<{
            name: string;
            body: string;
          }>;
        };
        deposit: string;
      }>;
      fee: {
        gasWanted: string;
        gasFee: string;
      };
      signatures: Array<{
        pubKey: string | null;
        signature: string | null;
      }>;
      memo: string;
    }>;
  };
}
