export interface CosmosAccount {
  address: string;
  accountNumber: string;
  sequence: string;
}

export interface CosmosTxBroadcastResponse {
  txhash: string;
  code: number;
  rawLog: string;
  height: string;
}

export type CosmosBroadcastMode =
  | 'BROADCAST_MODE_SYNC'
  | 'BROADCAST_MODE_ASYNC'
  | 'BROADCAST_MODE_BLOCK';

/**
 * Abstract Cosmos network client consumed by the signing pipeline.
 *
 * Mirrors the Gno `Provider` injection pattern: adena-module owns only the
 * interface + value types, and concrete implementations (REST LCD, RPC client,
 * mock, etc.) live in the calling package and are injected at the signing
 * entry point. Keeps adena-module free of HTTP-client dependencies.
 */
export interface CosmosProvider {
  getAccount(address: string): Promise<CosmosAccount>;
  broadcastTx(
    txBytes: Uint8Array,
    mode?: CosmosBroadcastMode,
  ): Promise<CosmosTxBroadcastResponse>;
  simulateTx(txBytes: Uint8Array): Promise<{ gasUsed: number }>;
  getMinGasPrices(): Promise<{ denom: string; amount: string }[]>;
}
