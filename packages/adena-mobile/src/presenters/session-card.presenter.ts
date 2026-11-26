import { SessionCardDetailView, SessionCardRowView } from '../components/view-models';
import { Network } from '../domain/network';
import {
  CardPermissionKind,
  CardPolicy,
  cardRestrictions,
  CardStatus,
  describePermission,
  formatDuration,
  formatExpiry,
  formatRemaining,
  formatSpendPeriod,
  formatTimeLeft,
  SessionCard,
  spendResetsAt,
} from '../domain/session-card';
import { formatAddress } from '../utils/address';
import { formatTokenAmount } from '../utils/amount';
import { BigNumber } from '../utils/big-number';

const UNNAMED_CARD = 'Card';

const nativeLabel = (amount: string, network: Network): string =>
  `${formatTokenAmount(amount, network.nativeToken.decimals)} ${network.nativeToken.symbol}`;

const spentRatio = (card: SessionCard): number => {
  const limit = new BigNumber(card.session.spendLimit);

  return limit.isGreaterThan(0) ? new BigNumber(card.spendUsed).dividedBy(limit).toNumber() : 1;
};

export const cardName = (card: SessionCard): string => card.record?.name ?? `${UNNAMED_CARD} ${formatAddress(card.session.address, 4)}`;

const whereLabel = (card: SessionCard): string => {
  const [first, ...rest] = card.permissions.map(describePermission);

  if (!first) {
    return 'Nowhere';
  }

  return rest.length > 0 ? `${first} +${rest.length}` : first;
};

export const toSessionCardRowView = (card: SessionCard, network: Network, nowSeconds: number): SessionCardRowView => ({
  id: card.session.address,
  name: cardName(card),
  whereLabel: whereLabel(card),
  usedLabel: nativeLabel(card.spendUsed, network),
  limitLabel: nativeLabel(card.session.spendLimit, network),
  ratio: spentRatio(card),
  timeLeftLabel: formatTimeLeft(card.session.expiresAt, nowSeconds),
  expired: card.status === CardStatus.EXPIRED,
});

export const toSessionCardDetailView = (card: SessionCard, network: Network, nowSeconds: number): SessionCardDetailView => {
  const resetsAt = spendResetsAt(card.session, nowSeconds);
  const limit = nativeLabel(card.session.spendLimit, network);

  return {
    name: cardName(card),
    expired: card.status === CardStatus.EXPIRED,
    address: card.session.address,
    usedLabel: nativeLabel(card.spendUsed, network),
    limitLabel: limit,
    ratio: spentRatio(card),
    usageCaption: resetsAt ? `Resets in ${formatRemaining(resetsAt - nowSeconds)}` : formatSpendPeriod(card.session.spendPeriod),
    where: card.permissions.map(describePermission),
    limitRow: `${limit} · ${formatSpendPeriod(card.session.spendPeriod)}, network fees included`,
    untilRow: `${formatExpiry(card.session.expiresAt)} · ${formatTimeLeft(card.session.expiresAt, nowSeconds)}`,
    restrictions: cardRestrictions(card.permissions),
    issuedElsewhere: !card.record,
  };
};

export interface CardReviewContent {
  title: string;
  rows: { label: string; value: string; multiline?: boolean; emphasis?: boolean }[];
  warnings: { title: string; description?: string }[];
  confirmLabel: string;
  destructive?: boolean;
}

// `tokenRealms` are the opened realms whose functions can move tokens; the GNOT limit does not cap those.
export const toIssueReview = (policy: CardPolicy, tokenRealms: string[], network: Network, nowSeconds: number): CardReviewContent => {
  const limit = nativeLabel(policy.spendLimit, network);
  const allowsSend = policy.permissions.some(item => item.kind === CardPermissionKind.SEND);
  const warnings: CardReviewContent['warnings'] = [];

  if (tokenRealms.length > 0) {
    warnings.push({
      title: 'Opens your token balances',
      description: `${tokenRealms.join(', ')} can move tokens you hold. The ${network.nativeToken.symbol} limit does not cap them.`,
    });
  }

  if (allowsSend) {
    warnings.push({ title: `Can send ${network.nativeToken.symbol} anywhere`, description: `Up to ${limit}, to any address.` });
  }

  return {
    title: 'Issue card',
    rows: [
      { label: 'Name', value: policy.name.trim() },
      { label: 'Where', value: policy.permissions.map(describePermission).join('\n'), multiline: true },
      { label: 'Limit', value: `${limit} · ${formatSpendPeriod(policy.spendPeriod)}, network fees included`, multiline: true },
      { label: 'Until', value: `${formatDuration(policy.duration)} · ends ${formatExpiry(nowSeconds + policy.duration)}`, multiline: true },
      {
        label: 'Worst case',
        value: tokenRealms.length > 0 ? `${limit}, plus the tokens those realms can move` : limit,
        multiline: true,
        emphasis: true,
      },
      { label: 'It can never', value: cardRestrictions(policy.permissions).join('\n'), multiline: true },
    ],
    warnings,
    confirmLabel: 'Hold to issue card',
  };
};

export const toRevokeReview = (card: SessionCard): CardReviewContent => ({
  title: 'Revoke card',
  rows: [
    { label: 'Card', value: cardName(card) },
    { label: 'Card address', value: card.session.address, multiline: true },
  ],
  warnings: [{ title: 'This cannot be undone', description: 'Anything using this card stops working right away.' }],
  confirmLabel: 'Hold to revoke',
  destructive: true,
});

export const toRevokeAllReview = (count: number): CardReviewContent => ({
  title: 'Revoke all cards',
  rows: [{ label: 'Cards', value: String(count) }],
  warnings: [{ title: 'This cannot be undone', description: 'Every card of this account stops working, including cards issued elsewhere.' }],
  confirmLabel: 'Hold to revoke all',
  destructive: true,
});
