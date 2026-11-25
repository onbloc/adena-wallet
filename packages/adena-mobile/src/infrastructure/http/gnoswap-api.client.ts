import { HttpClient } from './http-client';

// Response contracts of the GnoSwap REST API (`{apiUrl}` from resources/dex/dex-apis.json).

export interface GnoswapTokenMeta {
  path: string;
  name: string;
  symbol: string;
  description: string;
  type: string;
  decimals: number;
  logoURI: string;
  // GRC20 that carries the market for a native coin (ugnot -> wugnot); empty otherwise.
  wrappedPath: string;
  websiteURL: string;
  twitterURL: string;
  discordURL: string;
  docsURL: string;
  isVerified: boolean;
}

// Prices are decimal strings in USD per whole token.
export interface GnoswapCandle {
  start: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface GnoswapTokenPrice {
  path: string;
  usd: string;
  marketCap?: string;
  volumeUsd24h?: string;
}

interface Envelope<T> {
  data: T;
  message?: string;
}

interface OhlcvResponse {
  interval: number;
  start: number;
  end: number;
  data: GnoswapCandle[];
}

// Candle sizes the API accepts and the longest window (seconds) it serves per request.
export const GNOSWAP_OHLCV_MAX_WINDOW: Record<number, number> = {
  300: 36_000,
  900: 108_000,
  1800: 216_000,
  3600: 432_000,
  14_400: 1_728_000,
  43_200: 2_592_000,
  86_400: 2_592_000,
};

export class GnoswapApiClient {
  constructor(private readonly http: HttpClient) {}

  // Unknown paths still answer 200 with empty fields.
  async getTokenMeta(apiUrl: string, path: string): Promise<GnoswapTokenMeta | null> {
    const response = await this.http.request<Envelope<GnoswapTokenMeta>>(`${apiUrl}/token-metas/${encodeURIComponent(path)}`);
    const meta = response?.data;

    return meta && typeof meta === 'object' && meta.path ? meta : null;
  }

  async getTokenPrices(apiUrl: string): Promise<GnoswapTokenPrice[]> {
    const response = await this.http.request<Envelope<GnoswapTokenPrice[]>>(`${apiUrl}/tokens/prices`);

    return Array.isArray(response?.data) ? response.data : [];
  }

  // `start`/`end` are unix seconds aligned to `interval`; `end` is exclusive.
  async getOhlcv(apiUrl: string, path: string, interval: number, start: number, end: number): Promise<GnoswapCandle[]> {
    const query = `interval=${interval}&start=${start}&end=${end}`;
    const response = await this.http.request<OhlcvResponse>(`${apiUrl}/tokens/${encodeURIComponent(path)}/ohlcv?${query}`);

    return Array.isArray(response?.data) ? response.data : [];
  }
}
