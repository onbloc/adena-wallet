import {
  CosmosAccount,
  CosmosBroadcastMode,
  CosmosTxBroadcastResponse,
} from 'adena-module';
import axios, { AxiosInstance } from 'axios';

export type { CosmosAccount, CosmosBroadcastMode, CosmosTxBroadcastResponse };

/**
 * Stateless low-level HTTP client for Cosmos SDK LCD endpoints. Each method
 * takes the endpoint URL as its first argument so the client can be reused
 * across profiles. Lives in adena-extension because axios pulls in Node
 * built-ins when bundled via adena-module's rollup config (would cause
 * `Z_SYNC_FLUSH` crash in the browser). Extension's webpack picks axios's
 * browser build correctly.
 */
export class CosmosQueryClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({ timeout: 10_000 });
  }

  async getAllBalances(
    endpoint: string,
    address: string,
  ): Promise<{ denom: string; amount: string }[] | null> {
    try {
      const response = await this.axiosInstance.get<{
        balances: { denom: string; amount: string }[];
      }>(`${endpoint}/cosmos/bank/v1beta1/balances/${address}`);
      return response.data.balances ?? [];
    } catch {
      return null;
    }
  }

  async getBalance(
    endpoint: string,
    address: string,
    denom: string,
  ): Promise<string | null> {
    try {
      const response = await this.axiosInstance.get<{
        balance: { denom: string; amount: string };
      }>(`${endpoint}/cosmos/bank/v1beta1/balances/${address}/by_denom`, {
        params: { denom },
      });
      return response.data.balance?.amount ?? '0';
    } catch {
      return null;
    }
  }

  async getAccount(endpoint: string, address: string): Promise<CosmosAccount> {
    const response = await this.axiosInstance.get<{
      account: {
        '@type': string;
        address?: string;
        account_number?: string;
        sequence?: string;
        base_account?: {
          address?: string;
          account_number?: string;
          sequence?: string;
        };
      };
    }>(`${endpoint}/cosmos/auth/v1beta1/accounts/${address}`);

    const raw = response.data.account;
    const inner = raw.base_account ?? raw;

    return {
      address: inner.address ?? address,
      accountNumber: inner.account_number ?? '0',
      sequence: inner.sequence ?? '0',
    };
  }

  async broadcastTx(
    endpoint: string,
    txBytes: Uint8Array,
    mode: CosmosBroadcastMode = 'BROADCAST_MODE_SYNC',
  ): Promise<CosmosTxBroadcastResponse> {
    const body = {
      tx_bytes: Buffer.from(txBytes).toString('base64'),
      mode,
    };

    const response = await this.axiosInstance.post<{
      tx_response: {
        txhash: string;
        code: number;
        raw_log: string;
        height: string;
      };
    }>(`${endpoint}/cosmos/tx/v1beta1/txs`, body);

    const r = response.data.tx_response;
    if (!r) {
      throw new Error('Cosmos broadcast returned no tx_response');
    }
    if (r.code !== 0) {
      throw new Error(`Cosmos broadcast failed (code=${r.code}): ${r.raw_log}`);
    }
    return {
      txhash: r.txhash,
      code: r.code,
      rawLog: r.raw_log,
      height: r.height,
    };
  }
}
