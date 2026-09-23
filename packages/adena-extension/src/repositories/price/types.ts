import { AssetPrice } from '@types';

export interface ITokenPriceRepository {
  /** False when the current network has no price API to ask. */
  supported: boolean;
  /** Every asset the API prices, in one call. Empty when unsupported. */
  fetchAssetPrices: () => Promise<AssetPrice[]>;
}
