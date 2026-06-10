import { PubKeySecp256k1, Secp256k1PubKeyType } from '@gnolang/tm2-js-client';
import { Any } from '@gnolang/tm2-js-client/bin/proto/google/protobuf/any';
import Long from 'long';
import {
  compressPubkeyIfNeeded,
  MSG_CREATE_SESSION_ENDPOINT,
  MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
  MSG_REVOKE_SESSION_ENDPOINT,
} from 'adena-module';

// Chain-side limits for MsgCreateSession. In the merged session-account
// protocol, allow_paths is required and uses typed entries:
// "*" or <route>/<type>[:<path>].
const MAX_ALLOW_PATHS = 8;
const MAX_SPEND_PERIOD_SECONDS = 2_592_000; // 30 days
const ALLOW_PATHS_WILDCARD = '*';
const PATH_BEARING_ROUTE_TYPE = 'vm/exec';
const VALID_SESSION_ROUTE_TYPES = new Set([
  'vm/exec',
  'vm/run',
  'bank/send',
  'bank/multisend',
]);

// Matches ParseCoin's regex from gno tm2/pkg/std/coin.go:660 but tightened so
// the amount must be strictly positive. ParseCoins additionally rejects
// non-positive coins via Coins.validate() (coin.go:251), so this matches the
// effective server contract.
const COIN_ENTRY_REGEX = /^([0-9]+)\s*([a-z/][a-z0-9_.:/]{2,})$/;

interface CreateSessionMessageInfo {
  creator: string;
  sessionPublicKey: Uint8Array;
  expiresAt: number | string | Long;
  allowPaths: string[];
  spendLimit: string;
  spendPeriod: number | string | Long;
}

interface RevokeSessionMessageInfo {
  creator: string;
  sessionPublicKey: Uint8Array;
}

interface RevokeAllSessionsMessageInfo {
  creator: string;
}

const wrapSessionPubKey = (sessionPublicKey: Uint8Array): Any => {
  const compressed = compressPubkeyIfNeeded(sessionPublicKey);
  return Any.create({
    type_url: Secp256k1PubKeyType,
    value: PubKeySecp256k1.encode({ key: compressed }).finish(),
  });
};

const validateAllowPaths = (allowPaths: string[]): void => {
  if (allowPaths.length === 0) {
    throw new Error('allow_paths is required. Use ["*"] for unrestricted access.');
  }
  if (allowPaths.length > MAX_ALLOW_PATHS) {
    throw new Error(
      `allow_paths exceeds maximum of ${MAX_ALLOW_PATHS} entries (got ${allowPaths.length}).`,
    );
  }
  allowPaths.forEach((entry, index) => {
    if (entry === '') {
      throw new Error(`allow_paths[${index}] is empty.`);
    }
    if (entry === ALLOW_PATHS_WILDCARD) {
      return;
    }
    const colonIdx = entry.indexOf(':');
    const hasPath = colonIdx !== -1;
    const routeType = hasPath ? entry.slice(0, colonIdx) : entry;
    const path = hasPath ? entry.slice(colonIdx + 1) : '';
    if (routeType === ALLOW_PATHS_WILDCARD) {
      throw new Error(
        `allow_paths[${index}] wildcard must not have a path suffix.`,
      );
    }
    if (!VALID_SESSION_ROUTE_TYPES.has(routeType)) {
      throw new Error(
        `allow_paths[${index}] (${entry}) must be one of *, vm/exec, vm/run, bank/send, bank/multisend.`,
      );
    }
    if (!hasPath) {
      return;
    }
    if (routeType !== PATH_BEARING_ROUTE_TYPE) {
      throw new Error(
        `allow_paths[${index}] (${entry}) can only include a path after vm/exec.`,
      );
    }
    if (path === '') {
      throw new Error(`allow_paths[${index}] (${entry}) requires a non-empty path.`);
    }
    if (path.endsWith('/')) {
      throw new Error(
        `allow_paths[${index}] (${entry}) must not end with a trailing slash.`,
      );
    }
  });
};

const toLong = (value: number | string | Long): Long => {
  if (Long.isLong(value)) {
    return value as Long;
  }
  return Long.fromValue(value as number | string);
};

const validateSpendPeriod = (spendPeriod: number | string | Long): void => {
  const value = toLong(spendPeriod);
  if (value.isNegative()) {
    throw new Error('spend_period must be non-negative.');
  }
  if (value.greaterThan(MAX_SPEND_PERIOD_SECONDS)) {
    throw new Error(
      `spend_period exceeds maximum of ${MAX_SPEND_PERIOD_SECONDS} seconds (30 days).`,
    );
  }
};

const validateExpiresAt = (expiresAt: number | string | Long): void => {
  const value = toLong(expiresAt);
  if (value.isNegative()) {
    throw new Error('expires_at must be non-negative (0 means no expiry).');
  }
};

// Validates spend_limit against gno ParseCoins + Coins.validate() (coin.go).
// Empty string is allowed and means "no spending" (fail-closed); useful only
// when a co-signer pays gas.
const validateSpendLimit = (spendLimit: string): void => {
  const trimmed = spendLimit.trim();
  if (trimmed === '') {
    return;
  }
  const entries = trimmed.split(',').map((entry) => entry.trim());
  const seenDenoms = new Set<string>();
  entries.forEach((entry, index) => {
    const match = entry.match(COIN_ENTRY_REGEX);
    if (!match) {
      throw new Error(
        `invalid spend_limit: entry[${index}] "${entry}" does not match ` +
          '<amount><denom> (denom requires lowercase, min 3 chars).',
      );
    }
    const amount = match[1];
    const denom = match[2];
    if (amount === '0' || /^0+$/.test(amount)) {
      throw new Error(
        `invalid spend_limit: entry[${index}] "${entry}" has non-positive amount.`,
      );
    }
    if (seenDenoms.has(denom)) {
      throw new Error(
        `invalid spend_limit: duplicate denom "${denom}" at entry[${index}].`,
      );
    }
    seenDenoms.add(denom);
  });
};

export const createMessageOfCreateSession = (
  info: CreateSessionMessageInfo,
): {
  type: string;
  value: {
    creator: string;
    session_key: Any;
    expires_at: Long;
    allow_paths: string[];
    spend_limit: string;
    spend_period: Long;
  };
} => {
  validateAllowPaths(info.allowPaths);
  validateExpiresAt(info.expiresAt);
  validateSpendPeriod(info.spendPeriod);
  validateSpendLimit(info.spendLimit);

  return {
    type: MSG_CREATE_SESSION_ENDPOINT,
    value: {
      creator: info.creator,
      session_key: wrapSessionPubKey(info.sessionPublicKey),
      expires_at: toLong(info.expiresAt),
      allow_paths: info.allowPaths,
      spend_limit: info.spendLimit,
      spend_period: toLong(info.spendPeriod),
    },
  };
};

// `creator` must be the master address that owns the session (handler.go
// looks up the session under that master's session store).
export const createMessageOfRevokeSession = (
  info: RevokeSessionMessageInfo,
): {
  type: string;
  value: {
    creator: string;
    session_key: Any;
  };
} => {
  return {
    type: MSG_REVOKE_SESSION_ENDPOINT,
    value: {
      creator: info.creator,
      session_key: wrapSessionPubKey(info.sessionPublicKey),
    },
  };
};

// `creator` must be the master address. Revokes every session under it.
export const createMessageOfRevokeAllSessions = (
  info: RevokeAllSessionsMessageInfo,
): {
  type: string;
  value: { creator: string };
} => {
  return {
    type: MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
    value: { creator: info.creator },
  };
};
