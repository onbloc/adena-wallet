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
// Matches a single "<decimal><denom>" entry. Cosmos SDK denom rules allow
// [a-zA-Z][a-zA-Z0-9/]{2,127}; we accept the looser `[A-Za-z][A-Za-z0-9/]*`
// since the node itself has already validated the value.
const MIN_GAS_PRICE_ENTRY_RE = /^([0-9]+(?:\.[0-9]+)?)([A-Za-z][A-Za-z0-9/]*)$/;

export function parseMinimumGasPriceString(
  raw: string,
): { denom: string; amount: string }[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(MIN_GAS_PRICE_ENTRY_RE);
      if (!match) {
        throw new Error(`Unparseable minimum_gas_price entry: "${part}"`);
      }
      return { denom: match[2], amount: match[1] };
    });
}

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

  /**
   * Query the node's enforced `minimum_gas_price` via the standard SDK config
   * endpoint.
   *
   * AtomOne exposes the feemarket module only internally (app-level), not via
   * REST — `/feemarket/v1/gas_prices` returns 501 Not Implemented on both
   * mainnet and testnet LCDs. `/cosmos/base/node/v1beta1/config` is the
   * canonical SDK endpoint that returns the currently-enforced minimum, which
   * on feemarket-enabled chains already reflects the module's computed price.
   *
   * Response shape:
   *   { "minimum_gas_price": "0.0225uatone,0.225uphoton" }
   *
   * The field is a comma-joined list of `<dec><denom>` entries.
   */
  async getMinGasPrices(
    endpoint: string,
  ): Promise<{ denom: string; amount: string }[]> {
    const response = await this.axiosInstance.get<{
      minimum_gas_price?: string;
    }>(`${endpoint}/cosmos/base/node/v1beta1/config`);
    return parseMinimumGasPriceString(response.data.minimum_gas_price ?? '');
  }

  async simulateTx(
    endpoint: string,
    txBytes: Uint8Array,
  ): Promise<{ gasUsed: number }> {
    const body = { tx_bytes: Buffer.from(txBytes).toString('base64') };
    const response = await this.axiosInstance.post<{
      gas_info?: { gas_used?: string };
    }>(`${endpoint}/cosmos/tx/v1beta1/simulate`, body);
    const gasUsedRaw = response.data.gas_info?.gas_used;
    if (!gasUsedRaw) {
      throw new Error('Cosmos simulate returned no gas_info.gas_used');
    }
    const gasUsed = Number(gasUsedRaw);
    if (!Number.isFinite(gasUsed) || gasUsed <= 0) {
      throw new Error(`Cosmos simulate returned invalid gas_used=${gasUsedRaw}`);
    }
    return { gasUsed };
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
