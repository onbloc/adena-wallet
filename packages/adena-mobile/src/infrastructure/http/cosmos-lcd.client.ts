import { AppError, AppErrorCode } from '../../core/errors';
import { HttpClient, HttpStatusError } from './http-client';

export interface CosmosCoin {
  denom: string;
  amount: string;
}

export interface CosmosAccountInfo {
  accountNumber: string;
  sequence: string;
}

type RawAccount = Record<string, unknown> & { account_number?: string; sequence?: string };

const MAX_BALANCE_PAGES = 50;
const GRPC_NOT_FOUND = 5;

const VESTING_TYPES = new Set([
  '/cosmos.vesting.v1beta1.ContinuousVestingAccount',
  '/cosmos.vesting.v1beta1.DelayedVestingAccount',
  '/cosmos.vesting.v1beta1.PeriodicVestingAccount',
  '/cosmos.vesting.v1beta1.PermanentLockedAccount',
]);

const isObject = (value: unknown): value is RawAccount => typeof value === 'object' && value !== null && !Array.isArray(value);

const isUint = (value: unknown): boolean => value === undefined || (typeof value === 'string' && /^\d+$/.test(value));

// Returns the BaseAccount of a supported account type, or null for any other shape.
// Module accounts nest it in base_account, vesting accounts in base_vesting_account.base_account.
const baseAccountOf = (account: unknown): RawAccount | null => {
  if (!isObject(account)) {
    return null;
  }

  const type = account['@type'];

  if (type === '/cosmos.auth.v1beta1.BaseAccount') {
    return account;
  }

  if (type === '/cosmos.auth.v1beta1.ModuleAccount') {
    return isObject(account.base_account) ? account.base_account : null;
  }

  if (typeof type === 'string' && VESTING_TYPES.has(type) && isObject(account.base_vesting_account)) {
    const base = account.base_vesting_account.base_account;

    return isObject(base) ? base : null;
  }

  return null;
};

// grpc-gateway maps codes.NotFound to HTTP 404 with `{ code: 5 }`; a bare 404 may be a wrong URL.
const isAccountNotFound = (error: unknown): boolean =>
  error instanceof HttpStatusError && error.status === 404 && (error.body as { code?: unknown } | null)?.code === GRPC_NOT_FOUND;

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

  // Follows pagination.next_key: a denom on a later page must not read as a zero balance.
  async getBalances(restUrl: string, address: string): Promise<CosmosCoin[]> {
    const balances: CosmosCoin[] = [];
    const seenKeys = new Set<string>();
    let nextKey: string | null = null;

    for (let page = 0; page < MAX_BALANCE_PAGES; page++) {
      const query: string = nextKey ? `?pagination.key=${encodeURIComponent(nextKey)}` : '';
      const body: { balances?: CosmosCoin[]; pagination?: { next_key?: string | null } } = await this.http.request(
        this.url(restUrl, `/cosmos/bank/v1beta1/balances/${address}${query}`),
      );

      balances.push(...(body.balances ?? []));
      nextKey = body.pagination?.next_key || null;

      if (!nextKey) {
        return balances;
      }

      if (seenKeys.has(nextKey)) {
        throw new AppError(AppErrorCode.NETWORK_ERROR, 'Balance pagination repeated a page key');
      }

      seenKeys.add(nextKey);
    }

    throw new AppError(AppErrorCode.NETWORK_ERROR, `Balances span more than ${MAX_BALANCE_PAGES} pages`);
  }

  // Only a gRPC NotFound means a never-funded account (first tx starts at 0/0); other failures propagate.
  async getAccount(restUrl: string, address: string): Promise<CosmosAccountInfo | null> {
    let body: { account?: unknown };

    try {
      body = await this.http.request<{ account?: unknown }>(this.url(restUrl, `/cosmos/auth/v1beta1/accounts/${address}`));
    }
    catch (error) {
      if (isAccountNotFound(error)) {
        return null;
      }

      throw error;
    }

    const inner = baseAccountOf(body?.account);

    // Signer state is never invented from an unexpected body: the account must be this address.
    if (!inner || inner.address !== address || !isUint(inner.account_number) || !isUint(inner.sequence)) {
      throw new AppError(AppErrorCode.NETWORK_ERROR, 'Account response is not a supported account for this address');
    }

    // proto3 JSON omits zero values.
    return { accountNumber: inner.account_number ?? '0', sequence: inner.sequence ?? '0' };
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
