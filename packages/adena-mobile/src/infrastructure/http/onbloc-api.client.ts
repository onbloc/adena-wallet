import { ActivityFilterKind } from '../../domain/activity';
import { HttpClient } from './http-client';

// Response contracts of the onbloc REST API (`network.apiUrl`).

export interface AccountAsset {
  address: string;
  amount: string;
  decimals: number;
  logoUrl: string | null;
  name: string;
  packagePath: string;
  symbol: string;
  tokenType: string;
  // Opaque "{pkg}.{symbol}.{seq}"; never use it as an identity.
  tokenId: string;
  // Registry key "{pkg}.{symbol}".
  tokenKey?: string;
}

export interface AccountGrc721Collection {
  tokenId: string;
  packagePath: string;
  name: string;
  symbol: string;
  tokenCount: number;
  ownedCount: number;
}

export interface AccountGrc721Item {
  tokenId: string;
  packagePath: string;
  nftId: string;
  name: string;
  symbol: string;
  ownerAddress: string;
  isOwned: boolean;
}

export interface ApiPage {
  cursor?: string | null;
  hasNext: boolean;
}

export interface TransactionHistoryItem {
  amountIn: { denom: string; value: string };
  amountOut: { denom: string; value: string };
  blockHeight: number;
  fee: { denom: string; value: string };
  func: { funcType: string; messageType: string; pkgPath: string }[];
  isGRC20Transfer: boolean;
  isGRC721Transfer: boolean;
  messageCount: number;
  successYn: boolean;
  timestamp: string;
  fromAddress: string;
  toAddress: string;
  txHash: string;
}

export interface AssetPriceItem {
  assetId: string;
  provider: string;
  quoteCurrency: string;
  price: string;
  status: string;
  changeRateOneDay: number | null;
}

export type HistoryScope
  = | { kind: typeof ActivityFilterKind.ALL }
    | { kind: typeof ActivityFilterKind.NATIVE }
    | { kind: typeof ActivityFilterKind.GRC20; tokenKey: string };

// The API wraps payloads in `data`, sometimes twice.
const unwrap = <T>(body: unknown): T => {
  let value = body as { data?: unknown };

  for (let depth = 0; depth < 2 && value && typeof value === 'object' && 'data' in value; depth++) {
    value = value.data as { data?: unknown };
  }

  return value as T;
};

export class OnblocApiClient {
  constructor(private readonly http: HttpClient) {}

  private async get<T>(apiUrl: string, path: string): Promise<T> {
    return unwrap<T>(await this.http.request(`${apiUrl.replace(/\/+$/, '')}${path}`));
  }

  async getAccountAssets(apiUrl: string, address: string): Promise<AccountAsset[]> {
    const data = await this.get<{ assets?: AccountAsset[] }>(apiUrl, `/v1/accounts/${address}`);

    return data?.assets ?? [];
  }

  async getAccountCollections(apiUrl: string, address: string): Promise<AccountGrc721Collection[]> {
    const data = await this.get<{ items?: AccountGrc721Collection[] }>(apiUrl, `/v1/accounts/${address}/grc721-tokens`);

    return data?.items ?? [];
  }

  async getCollectionItems(apiUrl: string, address: string, collectionId: string, cursor?: string | null, limit = 100): Promise<{ items: AccountGrc721Item[]; page: ApiPage }> {
    const query = `?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const data = await this.get<{ items?: AccountGrc721Item[]; page?: ApiPage }>(
      apiUrl,
      `/v1/accounts/${address}/grc721-tokens/${encodeURIComponent(collectionId)}/items${query}`,
    );

    return { items: data?.items ?? [], page: data?.page ?? { hasNext: false } };
  }

  async getTransactions(apiUrl: string, address: string, scope: HistoryScope, cursor?: string | null): Promise<{ items: TransactionHistoryItem[]; page: ApiPage }> {
    const base = `/v1/accounts/${address}`;
    const path = scope.kind === ActivityFilterKind.ALL
      ? `${base}/transactions`
      : scope.kind === ActivityFilterKind.NATIVE
        ? `${base}/native-coin/transactions`
        : `${base}/grc20-token/${encodeURIComponent(scope.tokenKey)}/transactions`;
    const data = await this.get<{ items?: TransactionHistoryItem[]; page?: ApiPage }>(
      apiUrl,
      `${path}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    );

    return { items: data?.items ?? [], page: data?.page ?? { hasNext: false } };
  }

  async getPrices(apiUrl: string): Promise<AssetPriceItem[]> {
    const data = await this.get<{ items?: AssetPriceItem[] }>(apiUrl, '/v1/prices');

    return data?.items ?? [];
  }
}
