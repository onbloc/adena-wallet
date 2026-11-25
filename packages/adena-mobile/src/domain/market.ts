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

// Price history for one chart range; empty `chart` when the network has no market data source.
export interface TokenMarketData {
  tokenId: string;
  networkId: string;
  range: ChartRange;
  // Latest close in the range.
  priceUsd?: number;
  // Percent change from the range open to the latest close.
  changePercent?: number;
  chart: PricePoint[];
}

// Range-independent token facts for the About, Stats and Links sections.
export interface TokenMarketInfo {
  tokenId: string;
  networkId: string;
  about?: string;
  stats: MarketStats;
  links: MarketLink[];
}
