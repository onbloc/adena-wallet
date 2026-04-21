import {
  CosmosAccount,
  CosmosBroadcastMode,
  CosmosProvider,
  CosmosTxBroadcastResponse,
} from 'adena-module';
import axios, { AxiosInstance } from 'axios';

// Re-export the module-side types so existing extension import sites keep
// working against `@common/provider/cosmos/cosmos-lcd-provider`.
export type {
  CosmosAccount,
  CosmosBroadcastMode,
  CosmosTxBroadcastResponse,
} from 'adena-module';

/**
 * REST LCD implementation of {@link CosmosProvider}. Lives in adena-extension
 * because axios pulls in Node built-ins when bundled via adena-module's rollup
 * config (causes `Z_SYNC_FLUSH` crash in the browser). Extension's webpack
 * correctly picks axios's browser build.
 *
 * Injected into AdenaWallet cosmos methods via the TransactionService, mirroring
 * how GnoProvider is injected for the Gno path.
 */
export class CosmosLcdProvider implements CosmosProvider {
  private axiosInstance: AxiosInstance;

  constructor(private baseUrl: string) {
    if (!baseUrl) {
      console.warn('CosmosLcdProvider: empty baseUrl — all queries will fail');
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.axiosInstance = axios.create({ timeout: 10_000 });
  }

  // Reserved for future network switching (Phase 7+).
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
  }

  async getAllBalances(
    address: string,
  ): Promise<{ denom: string; amount: string }[] | null> {
    try {
      const response = await this.axiosInstance.get<{
        balances: { denom: string; amount: string }[];
      }>(`${this.baseUrl}/cosmos/bank/v1beta1/balances/${address}`);
      return response.data.balances ?? [];
    } catch {
      return null;
    }
  }

  async getBalance(address: string, denom: string): Promise<string | null> {
    try {
      const response = await this.axiosInstance.get<{
        balance: { denom: string; amount: string };
      }>(`${this.baseUrl}/cosmos/bank/v1beta1/balances/${address}/by_denom`, {
        params: { denom },
      });
      return response.data.balance?.amount ?? '0';
    } catch {
      return null;
    }
  }

  async getAccount(address: string): Promise<CosmosAccount> {
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
    }>(`${this.baseUrl}/cosmos/auth/v1beta1/accounts/${address}`);

    const raw = response.data.account;
    const inner = raw.base_account ?? raw;

    return {
      address: inner.address ?? address,
      accountNumber: inner.account_number ?? '0',
      sequence: inner.sequence ?? '0',
    };
  }

  async broadcastTx(
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
    }>(`${this.baseUrl}/cosmos/tx/v1beta1/txs`, body);

    const r = response.data.tx_response;
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
