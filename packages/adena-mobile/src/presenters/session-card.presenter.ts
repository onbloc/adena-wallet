import { ReviewContent, SessionCardDetailView, SessionCardRowView, SessionTaskView } from '../components/view-models';
import { ScheduledSend } from '../domain/card-template';
import { Network } from '../domain/network';
import {
  CardPermission,
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
import { SessionTask, SessionTaskStatus } from '../domain/session-task';
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

// A realm by its last path segment, for tight tiles.
const shortPermission = (permission: CardPermission | undefined): string => {
  if (!permission) {
    return 'Nowhere';
  }

  if (permission.kind === CardPermissionKind.REALM) {
    return permission.path.split('/').slice(-2).join('/');
  }

  return permission.kind === CardPermissionKind.SEND ? 'Send GNOT' : describePermission(permission);
};

const amountOnly = (amount: string, network: Network): string => formatTokenAmount(amount, network.nativeToken.decimals);

const kindLabel = (card: SessionCard): string => (card.record ? 'Card on this phone' : 'Issued elsewhere');

// "this week" style label for the current spend period.
const periodLabel = (card: SessionCard): string => {
  switch (card.session.spendPeriod) {
    case 0:
      return 'In total';
    case 86400:
      return 'Today';
    case 604800:
      return 'This week';
    default:
      return 'This period';
  }
};

const shortTimeLeft = (expiresAt: number, nowSeconds: number): string =>
  expiresAt === 0 ? 'No expiry' : expiresAt > nowSeconds ? formatRemaining(expiresAt - nowSeconds) : 'Expired';

export const toSessionCardRowView = (card: SessionCard, network: Network, nowSeconds: number): SessionCardRowView => {
  const name = cardName(card);

  return {
    id: card.session.address,
    name,
    initial: name.charAt(0).toUpperCase(),
    kindLabel: kindLabel(card),
    whereLabel: whereLabel(card),
    usedAmount: amountOnly(card.spendUsed, network),
    limitLabel: `/ ${nativeLabel(card.session.spendLimit, network)}`,
    periodLabel: periodLabel(card),
    ratio: spentRatio(card),
    timeLeftLabel: shortTimeLeft(card.session.expiresAt, nowSeconds),
    expired: card.status === CardStatus.EXPIRED,
  };
};

export const toSessionCardDetailView = (card: SessionCard, network: Network, nowSeconds: number): SessionCardDetailView => {
  const resetsAt = spendResetsAt(card.session, nowSeconds);
  const limit = nativeLabel(card.session.spendLimit, network);
  const row = toSessionCardRowView(card, network, nowSeconds);

  return {
    name: row.name,
    initial: row.initial,
    kindLabel: row.kindLabel,
    expired: row.expired,
    address: card.session.address,
    usedAmount: row.usedAmount,
    limitLabel: row.limitLabel,
    periodLabel: row.periodLabel,
    ratio: row.ratio,
    usageCaption: resetsAt ? `Resets in ${formatRemaining(resetsAt - nowSeconds)}` : undefined,
    whereLabel: row.whereLabel,
    whereTile: shortPermission(card.permissions[0]),
    whereCaption: card.permissions.length > 1 ? `+${card.permissions.length - 1} more` : undefined,
    limitTile: limit,
    limitCaption: formatSpendPeriod(card.session.spendPeriod),
    untilTile: formatTimeLeft(card.session.expiresAt, nowSeconds),
    untilCaption: formatExpiry(card.session.expiresAt),
    where: card.permissions.map(describePermission),
    restrictions: cardRestrictions(card.permissions),
    issuedElsewhere: !card.record,
  };
};

export type CardReviewContent = ReviewContent;

// `tokenRealms` are the opened realms whose functions can move tokens; the GNOT limit does not cap those.
export const toIssueReview = (
  policy: CardPolicy,
  tokenRealms: string[],
  network: Network,
  nowSeconds: number,
  schedule?: ScheduledSend,
): ReviewContent => {
  const limit = nativeLabel(policy.spendLimit, network);
  const allowsSend = policy.permissions.some(item => item.kind === CardPermissionKind.SEND);
  const warnings: ReviewContent['warnings'] = [];

  if (tokenRealms.length > 0) {
    warnings.push({
      title: 'Opens your token balances',
      description: `${tokenRealms.join(', ')} can move tokens you hold. The ${network.nativeToken.symbol} limit does not cap them.`,
    });
  }

  if (schedule) {
    warnings.push({ title: 'Keep the app open until it sends', description: 'The card key for the send is kept only in memory. If the app is closed first, the send is skipped.' });
  }

  return {
    title: 'Issue card',
    subtitle: policy.name.trim(),
    facts: [
      { icon: 'pin', label: 'Where', value: policy.permissions.map(describePermission).join('\n') },
      { icon: 'gauge', label: 'How much', value: `Up to ${limit} ${formatSpendPeriod(policy.spendPeriod).toLowerCase()}, fees included` },
      { icon: 'clock', label: 'Until', value: `${formatExpiry(nowSeconds + policy.duration)} · ${formatDuration(policy.duration)}` },
      ...(schedule
        ? [{ icon: 'arrowUp' as const, label: 'Then', value: `Sends ${nativeLabel(schedule.amount, network)} to ${formatAddress(schedule.toAddress, 6)} in ${schedule.delaySeconds} seconds, signed by the card` }]
        : []),
    ],
    restrictions: cardRestrictions(policy.permissions),
    assurances: tokenRealms.length === 0 && !allowsSend ? ['It cannot touch your token balances'] : [],
    worstCase: { value: limit, caption: tokenRealms.length > 0 ? '+ tokens those realms can move' : allowsSend ? 'to any address' : undefined },
    warnings,
    confirmLabel: 'Hold to approve',
  };
};

export const toRevokeReview = (card: SessionCard): ReviewContent => ({
  title: 'Revoke card',
  subtitle: cardName(card),
  facts: [{ icon: 'card', label: 'Card address', value: card.session.address }],
  warnings: [{ title: 'This cannot be undone', description: 'Anything using this card stops working right away.' }],
  confirmLabel: 'Hold to revoke',
  destructive: true,
});

export const toRevokeAllReview = (count: number): ReviewContent => ({
  title: 'Revoke all cards',
  facts: [{ icon: 'card', label: 'Cards', value: String(count) }],
  warnings: [{ title: 'This cannot be undone', description: 'Every card of this account stops working, including cards issued elsewhere.' }],
  confirmLabel: 'Hold to revoke all',
  destructive: true,
});

export const toSessionTaskView = (task: SessionTask, network: Network, nowMs: number): SessionTaskView => {
  const title = `${nativeLabel(task.amount, network)} to ${formatAddress(task.toAddress, 4)}`;

  switch (task.status) {
    case SessionTaskStatus.SCHEDULED:
      return { id: task.id, title, statusLabel: `In ${Math.max(0, Math.ceil((task.runAt - nowMs) / 1000))}s`, tone: 'neutral' };
    case SessionTaskStatus.RUNNING:
      return { id: task.id, title, statusLabel: 'Sending…', tone: 'neutral' };
    case SessionTaskStatus.SENT:
      return { id: task.id, title, statusLabel: 'Sent', tone: 'success' };
    case SessionTaskStatus.UNCONFIRMED:
      return { id: task.id, title, statusLabel: 'Not confirmed', tone: 'warning' };
    case SessionTaskStatus.MISSED:
      return { id: task.id, title, statusLabel: 'Missed', tone: 'warning' };
    case SessionTaskStatus.FAILED:
      return { id: task.id, title: `${title} · ${task.error ?? 'Failed'}`, statusLabel: 'Failed', tone: 'error' };
  }
};
