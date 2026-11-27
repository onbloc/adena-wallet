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
  ACTIVITY: 'activity',
} as const;

export type MainTab = (typeof MainTab)[keyof typeof MainTab];

export type ChatToolStatus = 'running' | 'done' | 'error';

export interface ChatToolView {
  id: string;
  label: string;
  status: ChatToolStatus;
}

export type ChatDraftState = 'pending' | 'sent' | 'dismissed';

export interface ChatDraftView {
  id: string;
  // e.g. 'Send 1 GNOT'.
  title: string;
  rows: { label: string; value: string; multiline?: boolean }[];
  state: ChatDraftState;
}

export interface ChatMessageView {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  // Shows a typing indicator while the text grows.
  streaming?: boolean;
  // Inline error under the bubble.
  error?: string;
  warnings?: string[];
  tools?: ChatToolView[];
  drafts?: ChatDraftView[];
}

export type ChatLocalModelState = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

export type ChatSetup
  = | { kind: 'ready' }
  // No API key for the hosted model.
    | { kind: 'needs-key' }
    | { kind: 'local-model'; state: ChatLocalModelState; percentage?: number; message?: string };
