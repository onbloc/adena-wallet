import { AssetPrice } from '@types';

export interface ITokenPriceRepository {
  /**
   * The endpoint quotes come from, or null when the network has none. Callers
   * key their caches on it: quotes from one source must never be read as the
   * answer from another.
   */
  apiUrl: string | null;
  /** False when the current network has no price API to ask. */
  supported: boolean;
  /** Every asset the API prices, in one call. Empty when unsupported. */
  fetchAssetPrices: () => Promise<AssetPrice[]>;
}
