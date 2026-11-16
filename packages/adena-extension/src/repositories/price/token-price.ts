import { AxiosInstance } from 'axios';

import { AssetPrice, NetworkMetainfo } from '@types';
import { AssetPriceMapper } from './mapper/asset-price-mapper';
import { AssetPricesResponse } from './response/asset-price-response';
import { ITokenPriceRepository } from './types';

/**
 * Market prices from onbloc-api-v3 (`GET /v1/prices`). The API answers with
 * every asset the deployment subscribes to, so the whole screen is priced by
 * one request no matter how many tokens it shows.
 *
 * Quotes are market-wide, keyed by the feed's own asset id (a CoinMarketCap
 * slug) and carrying a ticker alongside; mapping them onto wallet tokens is
 * the service's job.
 */
export class TokenPriceRepository implements ITokenPriceRepository {
  private axiosInstance: AxiosInstance;
  private network: NetworkMetainfo | null;

  // Concurrent callers within one round trip share a response rather than
  // each opening their own; the payload is identical for all of them.
  private inflightRequest: Promise<AssetPrice[]> | null = null;

  constructor(axiosInstance: AxiosInstance, network: NetworkMetainfo | null) {
    this.axiosInstance = axiosInstance;
    this.network = network;
  }

  public get apiUrl(): string | null {
    return this.network?.apiUrl || null;
  }

  // Local and custom networks carry no apiUrl; there is nothing to ask.
  public get supported(): boolean {
    return this.apiUrl !== null;
  }

  public async fetchAssetPrices(): Promise<AssetPrice[]> {
    const apiUrl = this.apiUrl;
    if (!apiUrl) {
      return [];
    }

    if (this.inflightRequest) {
      return this.inflightRequest;
    }

    // Errors are left to propagate: the caller's query keeps the last good
    // quotes on a failed poll, which a silent empty result would wipe out.
    const request = this.axiosInstance
      .get<{ data: AssetPricesResponse }>(`${apiUrl}/v1/prices`)
      .then((response) => AssetPriceMapper.fromResponse(response.data?.data))
      .finally(() => {
        this.inflightRequest = null;
      });

    this.inflightRequest = request;

    return request;
  }
}
