export const ChartRange = {
  ONE_HOUR: '1H',
  ONE_DAY: '1D',
  ONE_WEEK: '1W',
  ONE_MONTH: '1M',
  ONE_YEAR: '1Y',
} as const;

export type ChartRange = (typeof ChartRange)[keyof typeof ChartRange];

export const CHART_RANGES: ChartRange[] = Object.values(ChartRange);

export interface PricePoint {
  timestamp: number;
  priceUsd: number;
}

export interface MarketStats {
  marketCapUsd?: number;
  fullyDilutedValuationUsd?: number;
  volume24hUsd?: number;
  high52wUsd?: number;
  low52wUsd?: number;
}

export interface MarketLink {
  label: string;
  url: string;
}

export interface TokenMarketData {
  tokenId: string;
  networkId: string;
  range: ChartRange;
  priceUsd: number;
  // Percent change over `range`.
  changePercent: number;
  chart: PricePoint[];
  stats: MarketStats;
  about?: string;
  links: MarketLink[];
  // True while the data comes from the mock repository instead of a market data source.
  isSample: boolean;
}
