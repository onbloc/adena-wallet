export interface Status {
  node_info: {
    version_set: Array<{
      Name: string;
      Version: string;
      Optional: boolean;
    }>;
    net_address: string;
    network: string;
    software: string;
    version: string;
    channels: string;
    moniker: string;
    other: {
      tx_index: string;
      rpc_address: string;
    };
  };

  sync_info: {
    latest_block_hash: string;
    latest_app_hash: string;
    latest_block_height: string;
    latest_block_time: string;
    catching_up: boolean;
  };

  validator_info: {
    address: string;
    pub_key: {
      '@type': string;
      value: string;
    };
    voting_power: string;
  };
}
