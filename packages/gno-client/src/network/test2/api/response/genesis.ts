export interface Genesis {
  genesis: {
    genesis_time: string;
    chain_id: string;
    consensus_params: {
      Block: {
        MaxTxBytes: string;
        MaxDataBytes: string;
        MaxBlockBytes: string;
        MaxGas: string;
        TimeIotaMS: string;
      };
      Validator: {
        PubKeyTypeURLs: Array<string>;
      };
    };
    validators: Array<{
      address: string;
      pub_key: {
        '@type': string;
        value: string;
      };
      power: string;
      name: string;
    }>;
    app_hash: string | null;
    app_state: {
      '@type': string;
      balances: Array<string>;
      txs: Array<{
        msg: Array<{
          '@type': string;
          creator: string;
          package: {
            Name: string;
            Path: string;
            Files: Array<{
              Name: string;
              Body: string;
            }>;
          };
          deposit: string;
        }>;
        fee: {
          gas_wanted: string;
          gas_fee: string;
        };
        signatures: Array<{
          pub_key: string | null;
          signature: string | null;
        }>;
        memo: string;
      }>;
    };
  };
}
