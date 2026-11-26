import { LocalTokenIcon } from '../domain/token';
import { Trend } from '../utils/price';

export { Trend };

export const AmountTone = {
  POSITIVE: 'positive',
  DEFAULT: 'default',
  MUTED: 'muted',
} as const;

export type AmountTone = (typeof AmountTone)[keyof typeof AmountTone];

// View models shared by pages; containers build them from domain data.
export interface AssetItemView {
  key: string;
  symbol: string;
  name: string;
  localIcon?: LocalTokenIcon;
  imageUrl?: string;
  quantity?: string;
  value?: string;
  change?: string;
  trend: Trend;
  loading: boolean;
  // Quantity is shown; only the USD value cell is a placeholder.
  valueLoading?: boolean;
}

export interface NftCardView {
  key: string;
  title: string;
  subtitle?: string;
  imageUri?: string | null;
  imageLoading: boolean;
}

export interface ActivityItemView {
  key: string;
  title: string;
  description?: string;
  amountLabel?: string;
  tone: AmountTone;
  failed: boolean;
  extraInfo?: string;
  icon: 'swap' | 'activity' | 'plus' | 'link';
}

export interface ActivitySectionView {
  title: string;
  items: ActivityItemView[];
}

export const MainTab = {
  WALLET: 'wallet',
  CARDS: 'cards',
  ACTIVITY: 'activity',
} as const;

export type MainTab = (typeof MainTab)[keyof typeof MainTab];

export interface SessionCardRowView {
  id: string;
  name: string;
  whereLabel: string;
  usedLabel: string;
  limitLabel: string;
  // 0..1 share of the limit spent in the current period.
  ratio: number;
  timeLeftLabel: string;
  expired: boolean;
}

export interface SessionCardDetailView {
  name: string;
  expired: boolean;
  address: string;
  usedLabel: string;
  limitLabel: string;
  ratio: number;
  usageCaption?: string;
  where: string[];
  limitRow: string;
  untilRow: string;
  restrictions: string[];
  // Issued by another wallet or device: no local name or key.
  issuedElsewhere: boolean;
}

export interface OrderRowView {
  // `${kind}:${id}`.
  id: string;
  kind: 'dca' | 'limit';
  title: string;
  subtitle: string;
  progress: number;
  progressLabel: string;
  statusLabel: string;
  claimLabel?: string;
}

export interface OrderDetailView {
  title: string;
  progress: number;
  progressLabel: string;
  statusLabel: string;
  rows: { label: string; value: string; emphasis?: boolean }[];
  notes: string[];
  canClaim: boolean;
  cancelDescription: string;
}
