import { AppError, AppErrorCode } from '../../core/errors';
import { HttpClient } from './http-client';

export interface CosmosCoin {
  denom: string;
  amount: string;
}

export interface CosmosAccountInfo {
  accountNumber: string;
  sequence: string;
}

// Cosmos SDK LCD (REST) contract used by AtomOne, mirroring the extension's CosmosQueryClient.
export class CosmosLcdClient {
  constructor(private readonly http: HttpClient) {}

  private url(restUrl: string, path: string): string {
    return `${restUrl.replace(/\/+$/, '')}${path}`;
  }

  async getNodeChainId(restUrl: string): Promise<string> {
    const body = await this.http.request<{ default_node_info?: { network?: string } }>(
      this.url(restUrl, '/cosmos/base/tendermint/v1beta1/node_info'),
    );
    const chainId = body.default_node_info?.network;

    if (!chainId) {
      throw new AppError(AppErrorCode.NETWORK_ERROR, 'Node did not report a chain id');
    }

    return chainId;
  }

  async getBalances(restUrl: string, address: string): Promise<CosmosCoin[]> {
    const body = await this.http.request<{ balances?: CosmosCoin[] }>(this.url(restUrl, `/cosmos/bank/v1beta1/balances/${address}`));

    return body.balances ?? [];
  }

  // Unknown (never funded) accounts return 404; the first transaction then starts at 0/0.
  async getAccount(restUrl: string, address: string): Promise<CosmosAccountInfo | null> {
    try {
      const body = await this.http.request<{ account?: Record<string, unknown> }>(
        this.url(restUrl, `/cosmos/auth/v1beta1/accounts/${address}`),
      );
      const account = body.account ?? {};
      const inner = (account.base_account ?? account) as { account_number?: string; sequence?: string };

      return { accountNumber: inner.account_number ?? '0', sequence: inner.sequence ?? '0' };
    }
    catch {
      return null;
    }
  }

  // "0.0225uatone,0.225uphoton" → [{ denom, amount }].
  async getMinGasPrices(restUrl: string): Promise<CosmosCoin[]> {
    const body = await this.http.request<{ minimum_gas_price?: string }>(this.url(restUrl, '/cosmos/base/node/v1beta1/config'));

    return (body.minimum_gas_price ?? '')
      .split(',')
      .map(entry => /^([0-9]+(?:\.[0-9]+)?)([A-Za-z][A-Za-z0-9/]*)$/.exec(entry.trim()))
      .filter((match): match is RegExpExecArray => match !== null)
      .map(match => ({ amount: match[1], denom: match[2] }));
  }

  async simulate(restUrl: string, txBytesBase64: string): Promise<string> {
    const body = await this.http.request<{ gas_info?: { gas_used?: string } }>(this.url(restUrl, '/cosmos/tx/v1beta1/simulate'), {
      method: 'POST',
      body: { tx_bytes: txBytesBase64 },
    });
    const gasUsed = body.gas_info?.gas_used;

    if (!gasUsed || Number(gasUsed) <= 0) {
      throw new AppError(AppErrorCode.TRANSACTION_FAILED, 'Simulation returned no gas usage');
    }

    return gasUsed;
  }

  async broadcastSync(restUrl: string, txBytesBase64: string): Promise<{ txhash: string; height: string }> {
    const body = await this.http.request<{ tx_response?: { txhash: string; code: number; raw_log: string; height: string } }>(
      this.url(restUrl, '/cosmos/tx/v1beta1/txs'),
      { method: 'POST', body: { tx_bytes: txBytesBase64, mode: 'BROADCAST_MODE_SYNC' } },
    );
    const response = body.tx_response;

    if (!response) {
      throw new AppError(AppErrorCode.TRANSACTION_FAILED, 'Broadcast returned no tx_response');
    }

    if (response.code !== 0) {
      throw new AppError(AppErrorCode.TRANSACTION_FAILED, `Broadcast failed (code ${response.code}): ${response.raw_log}`);
    }

    return { txhash: response.txhash, height: response.height };
  }
}
