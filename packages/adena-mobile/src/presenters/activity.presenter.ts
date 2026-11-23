import { ActivityItemView, ActivitySectionView, AmountTone } from '../components/view-models';
import { Activity, ActivityAmount, ActivityDirection, ActivityStatus, ActivityType } from '../domain/activity';
import { Network } from '../domain/network';
import { Token, TokenType } from '../domain/token';
import { shortenAddress } from '../utils/address';
import { formatTokenAmount } from '../utils/amount';

export interface ActivityView {
  key: string;
  title: string;
  description?: string;
  amountLabel?: string;
  tone: AmountTone;
  statusLabel: 'Confirmed' | 'Failed';
  dateLabel?: string;
  extraInfo?: string;
  activity: Activity;
}

export interface ActivitySection {
  title: string;
  items: ActivityView[];
}

// Same lookup as the extension: native denom or GRC20 registry key first, then the realm
// path, because history only carries the package path in `amount.denom`.
export const findActivityToken = (denom: string, tokens: Token[]): Token | undefined =>
  tokens.find(item => item.id === denom || item.denom === denom)
  ?? tokens.find(item => item.type === TokenType.GRC20 && item.pkgPath === denom);

// Resolves a raw amount to "1.5 GNOT"; unknown denoms keep the raw value and the last path segment.
export const formatActivityAmount = (amount: ActivityAmount, tokens: Token[]): string => {
  const token = findActivityToken(amount.denom, tokens);

  if (!token) {
    return `${amount.value} ${amount.denom.split('/').pop() ?? amount.denom}`;
  }

  return `${formatTokenAmount(amount.value, token.decimals)} ${token.symbol}`;
};

const pad = (value: number): string => String(value).padStart(2, '0');

export const formatDateTime = (iso?: string): string | undefined => {
  if (!iso) {
    return undefined;
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const dateSectionTitle = (iso: string | undefined, now: Date = new Date()): string => {
  if (!iso) {
    return 'Unknown date';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  const day = (value: Date): number => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diffDays = Math.round((day(now) - day(date)) / 86_400_000);

  if (diffDays === 0) return 'Today';

  if (diffDays === 1) return 'Yesterday';

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const toActivityView = (activity: Activity, tokens: Token[]): ActivityView => {
  const counterparty = activity.direction === ActivityDirection.IN ? activity.from : activity.to;
  const hasAmount = activity.amount && activity.amount.value !== '' && activity.amount.value !== '0';
  const signedAmount = hasAmount && activity.amount
    ? `${activity.direction === ActivityDirection.IN ? '+' : activity.direction === ActivityDirection.OUT ? '-' : ''}${formatActivityAmount(activity.amount, tokens)}`
    : undefined;

  return {
    key: activity.hash,
    title: activity.title,
    description: activity.type === ActivityType.TRANSFER && counterparty
      ? `${activity.direction === ActivityDirection.IN ? 'From' : 'To'}: ${shortenAddress(counterparty)}`
      : activity.typeName,
    amountLabel: signedAmount,
    tone: activity.status === ActivityStatus.FAIL ? AmountTone.MUTED : activity.direction === ActivityDirection.IN ? AmountTone.POSITIVE : AmountTone.DEFAULT,
    statusLabel: activity.status === ActivityStatus.SUCCESS ? 'Confirmed' : 'Failed',
    dateLabel: formatDateTime(activity.timestamp),
    extraInfo: activity.extraInfo,
    activity,
  };
};

export const groupActivities = (activities: Activity[], tokens: Token[], now?: Date): ActivitySection[] => {
  const sections: ActivitySection[] = [];

  for (const activity of activities) {
    const title = dateSectionTitle(activity.timestamp, now);
    const section = sections.find(item => item.title === title);
    const view = toActivityView(activity, tokens);

    if (section) {
      section.items.push(view);
    }
    else {
      sections.push({ title, items: [view] });
    }
  }

  return sections;
};

export const activityNetworkLabel = (network: Network): string => `${network.chainName} ${network.networkName}`;

const ACTIVITY_ICON: Record<Activity['type'], ActivityItemView['icon']> = {
  TRANSFER: 'swap',
  TRANSFER_GRC721: 'swap',
  ADD_PACKAGE: 'plus',
  CONTRACT_CALL: 'link',
  MULTI_CONTRACT_CALL: 'link',
};

export const toActivitySectionViews = (sections: ActivitySection[]): ActivitySectionView[] =>
  sections.map(section => ({
    title: section.title,
    items: section.items.map(item => ({
      key: item.key,
      title: item.title,
      description: item.description,
      amountLabel: item.amountLabel,
      tone: item.tone,
      failed: item.activity.status === ActivityStatus.FAIL,
      extraInfo: item.extraInfo,
      icon: ACTIVITY_ICON[item.activity.type],
    })),
  }));
