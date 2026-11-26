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
  initial: string;
  kindLabel: string;
  whereLabel: string;
  // Spent in the current period, without the symbol ("0.3").
  usedAmount: string;
  // "/ 2 GNOT".
  limitLabel: string;
  periodLabel: string;
  // 0..1 share of the limit spent in the current period.
  ratio: number;
  timeLeftLabel: string;
  expired: boolean;
}

export interface SessionCardDetailView {
  name: string;
  initial: string;
  kindLabel: string;
  expired: boolean;
  address: string;
  usedAmount: string;
  limitLabel: string;
  periodLabel: string;
  ratio: number;
  usageCaption?: string;
  whereLabel: string;
  whereTile: string;
  whereCaption?: string;
  limitTile: string;
  limitCaption: string;
  untilTile: string;
  untilCaption: string;
  where: string[];
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
  // DCA rounds drawn one segment each when there are few enough.
  segments?: { total: number; done: number };
  pillLabel: string;
  footerLeft: string;
  footerRight: string;
  claimable: boolean;
}

export interface OrderDetailView {
  row: OrderRowView;
  tiles: { icon: ReviewFactIcon; label: string; value: string; caption?: string }[];
  rows: { label: string; value: string; emphasis?: boolean }[];
  notes: string[];
  canClaim: boolean;
  cancelDescription: string;
}

export type ReviewFactIcon = 'pin' | 'gauge' | 'clock' | 'card' | 'arrowUp' | 'repeat' | 'swap' | 'wallet';

// What an approval sheet shows, without the fee (added by the screen).
export interface ReviewContent {
  title: string;
  subtitle?: string;
  facts: { icon: ReviewFactIcon; label: string; value: string }[];
  restrictions?: string[];
  assurances?: string[];
  rows?: { label: string; value: string }[];
  worstCase?: { value: string; caption?: string };
  warnings: { title: string; description?: string }[];
  confirmLabel: string;
  destructive?: boolean;
}

export interface SessionTaskView {
  id: string;
  title: string;
  statusLabel: string;
  tone: 'neutral' | 'success' | 'warning' | 'error';
}
