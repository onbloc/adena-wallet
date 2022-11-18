export interface Blocks {
  last_height: string;
  block_metas: Array<{
    block_id: {
      hash: string;
      parts: {
        total: string;
        hash: string;
      };
    };
    header: {
      version: string;
      chain_id: string;
      height: string;
      time: string;
      num_txs: string;
      total_txs: string;
      app_version: string;
      last_block_id: {
        hash: string;
        parts: {
          total: string;
          hash: string;
        };
      };
      last_commit_hash: string;
      data_hash: string;
      validators_hash: string;
      next_validators_hash: string;
      consensus_hash: string;
      app_hash: string;
      last_results_hash: string;
      proposer_address: string;
    };
  }>;
}
