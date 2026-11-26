// Session cards: gno.land session accounts the wallet issues for its own accounts.
// The chain enforces every limit here; the wallet only narrows what it lets the user request.

// tm2/pkg/std/account.go.
export const SESSION_MAX_PER_ACCOUNT = 16;
export const SESSION_MAX_ALLOW_PATHS = 8;
export const SESSION_MAX_SPEND_PERIOD_SECONDS = 30 * 24 * 60 * 60;

export const CARD_NAME_MAX_LENGTH = 24;
// Bounds the code lookups one namespace entry can trigger when checking it for token access.
export const MAX_TOKEN_REALM_LOOKUPS = 32;
// Warn before the chain's per-account cap is hit.
export const SESSION_COUNT_WARNING = SESSION_MAX_PER_ACCOUNT - 2;

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

export const CardDuration = {
  ONE_HOUR: HOUR,
  ONE_DAY: DAY,
  SEVEN_DAYS: 7 * DAY,
  THIRTY_DAYS: 30 * DAY,
} as const;

export type CardDuration = (typeof CardDuration)[keyof typeof CardDuration];

export const CARD_DURATIONS: CardDuration[] = Object.values(CardDuration);
// A short default keeps a leaked key useful for as little time as possible.
export const DEFAULT_CARD_DURATION: CardDuration = CardDuration.ONE_DAY;

export const SpendPeriod = {
  TOTAL: 0,
  DAILY: DAY,
  WEEKLY: 7 * DAY,
  EVERY_30_DAYS: 30 * DAY,
} as const;

export type SpendPeriod = (typeof SpendPeriod)[keyof typeof SpendPeriod];

export const SPEND_PERIODS: SpendPeriod[] = Object.values(SpendPeriod);

export const CardPermissionKind = {
  // vm/exec:<path>, the path itself and every package below it.
  REALM: 'realm',
  // bank/send, native coin transfers to any address.
  SEND: 'send',
  // Anything the wallet does not issue (e.g. "*", vm/run), shown for sessions created elsewhere.
  OTHER: 'other',
} as const;

export type CardPermissionKind = (typeof CardPermissionKind)[keyof typeof CardPermissionKind];

export type CardPermission
  = | { kind: typeof CardPermissionKind.REALM; path: string }
    | { kind: typeof CardPermissionKind.SEND }
    | { kind: typeof CardPermissionKind.OTHER; raw: string };

export type IssuablePermission = Exclude<CardPermission, { kind: typeof CardPermissionKind.OTHER }>;

const VM_EXEC = 'vm/exec';
const BANK_SEND = 'bank/send';

// gno.land/r/<segment>[/<segment>...]: lowercase package segments, no trailing slash.
const REALM_PATH = /^gno\.land\/r\/[a-z0-9_]+(?:\/[a-z0-9_.-]+)*$/;

export const toAllowPath = (permission: IssuablePermission): string =>
  permission.kind === CardPermissionKind.REALM ? `${VM_EXEC}:${permission.path}` : BANK_SEND;

export const parseAllowPath = (entry: string): CardPermission => {
  if (entry === BANK_SEND) {
    return { kind: CardPermissionKind.SEND };
  }

  const separator = entry.indexOf(':');

  if (separator > 0 && entry.slice(0, separator) === VM_EXEC && separator < entry.length - 1) {
    return { kind: CardPermissionKind.REALM, path: entry.slice(separator + 1) };
  }

  return { kind: CardPermissionKind.OTHER, raw: entry };
};

export const normalizeRealmPath = (input: string): string => input.trim().replace(/^https?:\/\//, '');

// Null when valid. Wildcards, bare vm/exec and vm/run are never issued: each opens every realm.
export const realmPathError = (path: string): string | null => {
  if (!path) {
    return 'Enter a realm path';
  }

  if (!path.startsWith('gno.land/r/')) {
    return 'Use a realm path that starts with gno.land/r/';
  }

  if (path.endsWith('/')) {
    return 'Remove the trailing slash';
  }

  return REALM_PATH.test(path) ? null : 'This is not a valid realm path';
};

// A realm entry already covered by a broader one adds nothing.
export const coversPath = (scope: string, path: string): boolean => path === scope || path.startsWith(`${scope}/`);

export interface CardPolicy {
  name: string;
  permissions: IssuablePermission[];
  // Raw ugnot amount; network fees are paid from it too.
  spendLimit: string;
  spendPeriod: SpendPeriod;
  duration: CardDuration;
}

export type CardPolicyError
  = | 'name'
    | 'permissions'
    | 'tooManyPermissions'
    | 'spendLimit'
    | 'spendPeriod';

const POSITIVE_INTEGER = /^[1-9]\d*$/;

export const validateCardPolicy = (policy: CardPolicy): CardPolicyError[] => {
  const errors: CardPolicyError[] = [];
  const name = policy.name.trim();

  if (!name || name.length > CARD_NAME_MAX_LENGTH) {
    errors.push('name');
  }

  if (policy.permissions.length === 0 || policy.permissions.some(item => item.kind === CardPermissionKind.REALM && realmPathError(item.path) !== null)) {
    errors.push('permissions');
  }

  if (policy.permissions.length > SESSION_MAX_ALLOW_PATHS) {
    errors.push('tooManyPermissions');
  }

  // Zero leaves the session unable to pay its own network fees.
  if (!POSITIVE_INTEGER.test(policy.spendLimit)) {
    errors.push('spendLimit');
  }

  if (policy.spendPeriod > policy.duration || policy.spendPeriod > SESSION_MAX_SPEND_PERIOD_SECONDS) {
    errors.push('spendPeriod');
  }

  return errors;
};

// Chain-agnostic session state as reported by the chain.
export interface ChainSession {
  address: string;
  masterAddress: string;
  // Base64 compressed public key; absent until the session signs its first tx.
  publicKey?: string;
  allowPaths: string[];
  // Raw amount in the network's native denom; '0' when the session cannot spend it.
  spendLimit: string;
  spendUsed: string;
  // Unix seconds.
  spendPeriod: number;
  spendResetAt: number;
  // Unix seconds; 0 means no expiry.
  expiresAt: number;
}

// Local, non-secret record of a card this device issued.
export interface CardRecord {
  sessionAddress: string;
  accountId: string;
  chainId: string;
  name: string;
  publicKey: string;
  createdAt: number;
  txHash?: string;
}

export const CardStatus = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
} as const;

export type CardStatus = (typeof CardStatus)[keyof typeof CardStatus];

export interface SessionCard {
  session: ChainSession;
  record?: CardRecord;
  status: CardStatus;
  permissions: CardPermission[];
  // Spend counted in the current period; the chain resets it once the period has passed.
  spendUsed: string;
}

export const cardStatus = (session: ChainSession, nowSeconds: number): CardStatus =>
  session.expiresAt > 0 && session.expiresAt <= nowSeconds ? CardStatus.EXPIRED : CardStatus.ACTIVE;

export const effectiveSpendUsed = (session: ChainSession, nowSeconds: number): string =>
  session.spendPeriod > 0 && session.spendResetAt > 0 && nowSeconds >= session.spendResetAt + session.spendPeriod
    ? '0'
    : session.spendUsed;

export const toSessionCard = (session: ChainSession, record: CardRecord | undefined, nowSeconds: number): SessionCard => ({
  session,
  record,
  status: cardStatus(session, nowSeconds),
  permissions: session.allowPaths.map(parseAllowPath),
  spendUsed: effectiveSpendUsed(session, nowSeconds),
});

export const formatDuration = (seconds: number): string => {
  if (seconds % DAY === 0) {
    const days = seconds / DAY;

    return days === 1 ? '1 day' : `${days} days`;
  }

  const hours = Math.max(1, Math.round(seconds / HOUR));

  return hours === 1 ? '1 hour' : `${hours} hours`;
};

export const formatSpendPeriod = (period: number): string => {
  switch (period) {
    case SpendPeriod.TOTAL:
      return 'In total';
    case SpendPeriod.DAILY:
      return 'Every day';
    case SpendPeriod.WEEKLY:
      return 'Every week';
    case SpendPeriod.EVERY_30_DAYS:
      return 'Every 30 days';
    default:
      return `Every ${formatDuration(period)}`;
  }
};

// Rounded down to the largest unit, never below a minute.
export const formatRemaining = (seconds: number): string => {
  const plural = (value: number, unit: string): string => (value === 1 ? `1 ${unit}` : `${value} ${unit}s`);

  if (seconds >= DAY) {
    return plural(Math.floor(seconds / DAY), 'day');
  }

  if (seconds >= HOUR) {
    return plural(Math.floor(seconds / HOUR), 'hour');
  }

  return plural(Math.max(1, Math.floor(seconds / 60)), 'minute');
};

export const formatTimeLeft = (expiresAt: number, nowSeconds: number): string => {
  if (expiresAt === 0) {
    return 'No expiry';
  }

  return expiresAt > nowSeconds ? `${formatRemaining(expiresAt - nowSeconds)} left` : 'Expired';
};

// End of the current spend period (spend_reset is its start). Undefined for a lifetime cap or once it has
// passed: the chain then starts a new period at the next spend, and nothing counts as used until then.
export const spendResetsAt = (session: ChainSession, nowSeconds: number): number | undefined => {
  const end = session.spendResetAt + session.spendPeriod;

  return session.spendPeriod > 0 && session.spendResetAt > 0 && end > nowSeconds ? end : undefined;
};

const pad = (value: number): string => String(value).padStart(2, '0');

// Local time, in the format Activity uses.
export const formatExpiry = (expiresAt: number): string => {
  if (expiresAt === 0) {
    return 'No expiry';
  }

  const date = new Date(expiresAt * 1000);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const describePermission = (permission: CardPermission): string => {
  switch (permission.kind) {
    case CardPermissionKind.REALM:
      return permission.path;
    case CardPermissionKind.SEND:
      return 'Send GNOT to any address';
    case CardPermissionKind.OTHER:
      return permission.raw === '*' ? 'Everything except cards and code deploys' : permission.raw;
  }
};

// What a session can never do, plus what this card's permissions leave out.
export const cardRestrictions = (permissions: CardPermission[]): string[] => {
  const unrestricted = permissions.some(item => item.kind === CardPermissionKind.OTHER);
  const restrictions = ['Create or revoke cards', 'Deploy code'];

  if (unrestricted) {
    return restrictions;
  }

  return [
    ...restrictions,
    'Run scripts',
    ...(permissions.some(item => item.kind === CardPermissionKind.SEND) ? [] : ['Send GNOT']),
  ];
};
