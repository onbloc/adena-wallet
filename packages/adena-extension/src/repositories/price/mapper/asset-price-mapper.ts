import BigNumber from 'bignumber.js';

import { AssetPrice } from '@types';
import { AssetPriceItem, AssetPricesResponse } from '../response/asset-price-response';

/** The feed publishes assets it has not priced yet under this status. */
const UNAVAILABLE_STATUS = 'unavailable';
/** `TokenPrice.usd` is USD by definition; a quote in anything else is not it. */
const SUPPORTED_QUOTE_CURRENCY = 'USD';

export class AssetPriceMapper {
  /**
   * Unpriced or non-USD assets are dropped rather than carried as zeroes —
   * a missing quote leaves the row in its price-less layout, which is honest,
   * while a zero would read as a real price of $0.
   *
   * A `stale` quote is kept: it is the last price the feed actually saw, and
   * dropping it would blank the screen for the length of a feed reconnect.
   */
  public static fromResponse(response: AssetPricesResponse | null | undefined): AssetPrice[] {
    const items = response?.items;
    if (!Array.isArray(items)) {
      return [];
    }

    return items.reduce<AssetPrice[]>((prices, item) => {
      const price = AssetPriceMapper.fromItem(item);
      if (price) {
        prices.push(price);
      }
      return prices;
    }, []);
  }

  private static fromItem(item: AssetPriceItem | null | undefined): AssetPrice | null {
    if (!item?.assetId) {
      return null;
    }

    if (item.status === UNAVAILABLE_STATUS) {
      return null;
    }

    if (item.quoteCurrency && item.quoteCurrency.toUpperCase() !== SUPPORTED_QUOTE_CURRENCY) {
      return null;
    }

    const usd = BigNumber(item.price ?? '');
    // A traded asset is never worth exactly nothing, so a zero — like an
    // unparseable or negative price — means the feed has no price rather than
    // a price of $0. Passing it through would put "$0.00" on the row and drag
    // the portfolio total down as if the holding were worthless.
    if (!usd.isFinite() || usd.isLessThanOrEqualTo(0)) {
      return null;
    }

    return {
      assetId: item.assetId,
      usd: usd.toNumber(),
      change24h: AssetPriceMapper.toChangeRate(item.changeRateOneDay),
    };
  }

  private static toChangeRate(rate: number | null | undefined): number | null {
    if (typeof rate !== 'number' || !Number.isFinite(rate)) {
      return null;
    }

    return rate;
  }
}
