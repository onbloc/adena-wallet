import { fromBase64 } from 'adena-module';

export const AGENT_HOST_NAME = 'xyz.onbloc.adena_agent';
export const AGENT_HOST_ENABLED_STORAGE_KEY = 'AGENT_HOST_ENABLED';
export const AGENT_HOST_STATUS_STORAGE_KEY = 'AGENT_HOST_STATUS';

// Agent sessions are bounded tighter than the chain allows: revoking needs the
// user, so a short expiry is what limits an abandoned session.
export const AGENT_SESSION_MAX_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
export const AGENT_SESSION_SPEND_DENOM = 'ugnot';

const MAX_AGENT_NAME_LENGTH = 32;
const SECP256K1_COMPRESSED_PUBKEY_LENGTH = 33;

export type AgentHostMethod = 'ping' | 'get_account' | 'create_session' | 'revoke_session';

export interface AgentHostRequest {
  id: string;
  method: AgentHostMethod;
  params?: Record<string, unknown>;
}

export interface AgentHostError {
  code: AgentHostErrorCode;
  message: string;
}

export type AgentHostErrorCode =
  | 'invalid_request'
  | 'invalid_params'
  | 'policy_violation'
  | 'no_wallet'
  | 'wallet_locked'
  | 'unsupported_account'
  | 'unsupported_network'
  | 'rejected'
  | 'transaction_failed'
  | 'internal_error';

export interface AgentHostResponse {
  id: string;
  result?: Record<string, unknown>;
  error?: AgentHostError;
}

export interface AgentHostStatus {
  connected: boolean;
  error?: string;
  updatedAt: number;
}

export interface CreateAgentSessionParams {
  sessionPublicKey: Uint8Array;
  allowPaths: string[];
  spendLimit: string;
  spendPeriod: number;
  expiresAt: number;
  agentName: string;
}

export interface RevokeAgentSessionParams {
  sessionPublicKey: Uint8Array;
  agentName: string;
}

export class AgentHostRequestError extends Error {
  constructor(
    public readonly code: AgentHostErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AgentHostRequestError';
  }
}

const METHODS: ReadonlySet<string> = new Set([
  'ping',
  'get_account',
  'create_session',
  'revoke_session',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const invalidParams = (message: string): AgentHostRequestError =>
  new AgentHostRequestError('invalid_params', message);

export const parseAgentHostRequest = (raw: unknown): AgentHostRequest => {
  if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id.length === 0) {
    throw new AgentHostRequestError('invalid_request', 'request id is required');
  }
  if (typeof raw.method !== 'string' || !METHODS.has(raw.method)) {
    throw new AgentHostRequestError('invalid_request', `unknown method: ${String(raw.method)}`);
  }
  if (raw.params !== undefined && !isRecord(raw.params)) {
    throw new AgentHostRequestError('invalid_request', 'params must be an object');
  }
  return {
    id: raw.id,
    method: raw.method as AgentHostMethod,
    params: raw.params as Record<string, unknown> | undefined,
  };
};

export const parseSessionPublicKey = (value: unknown): Uint8Array => {
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidParams('session_public_key is required');
  }
  let bytes: Uint8Array;
  try {
    bytes = fromBase64(value);
  } catch {
    throw invalidParams('session_public_key must be base64');
  }
  if (
    bytes.length !== SECP256K1_COMPRESSED_PUBKEY_LENGTH ||
    (bytes[0] !== 0x02 && bytes[0] !== 0x03)
  ) {
    throw invalidParams('session_public_key must be a compressed secp256k1 public key');
  }
  return bytes;
};

const parseNonNegativeInteger = (value: unknown, name: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw invalidParams(`${name} must be a non-negative integer`);
  }
  return value;
};

// Normalizes the agent label into a hostname-safe token; it is shown as the
// request origin in the approval popup and travels in its URL.
export const normalizeAgentName = (value: unknown): string => {
  if (typeof value !== 'string') {
    return 'agent';
  }
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_AGENT_NAME_LENGTH);
  return normalized || 'agent';
};

const hasSpendDenom = (spendLimit: string): boolean =>
  spendLimit
    .split(',')
    .map((entry) => entry.trim())
    .some((entry) => entry.endsWith(AGENT_SESSION_SPEND_DENOM) && /^[0-9]+/.test(entry));

export const parseCreateSessionParams = (
  params: Record<string, unknown> | undefined,
  nowSeconds: number,
): CreateAgentSessionParams => {
  if (!params) {
    throw invalidParams('params are required');
  }

  const sessionPublicKey = parseSessionPublicKey(params.session_public_key);

  const { allow_paths: allowPaths } = params;
  if (
    !Array.isArray(allowPaths) ||
    allowPaths.length === 0 ||
    !allowPaths.every((entry) => typeof entry === 'string' && entry.length > 0)
  ) {
    throw invalidParams('allow_paths must be a non-empty string array');
  }
  if (allowPaths.includes('*')) {
    throw new AgentHostRequestError(
      'policy_violation',
      'wildcard allow_paths are not allowed for agent sessions',
    );
  }

  const { spend_limit: spendLimit } = params;
  if (typeof spendLimit !== 'string' || !hasSpendDenom(spendLimit)) {
    throw new AgentHostRequestError(
      'policy_violation',
      `spend_limit must include ${AGENT_SESSION_SPEND_DENOM} to pay gas`,
    );
  }

  const spendPeriod =
    params.spend_period === undefined
      ? 0
      : parseNonNegativeInteger(params.spend_period, 'spend_period');

  const expiresAt = parseNonNegativeInteger(params.expires_at, 'expires_at');
  if (expiresAt <= nowSeconds) {
    throw new AgentHostRequestError('policy_violation', 'expires_at must be in the future');
  }
  if (expiresAt > nowSeconds + AGENT_SESSION_MAX_LIFETIME_SECONDS) {
    throw new AgentHostRequestError(
      'policy_violation',
      `expires_at must be within ${AGENT_SESSION_MAX_LIFETIME_SECONDS} seconds`,
    );
  }

  return {
    sessionPublicKey,
    allowPaths: allowPaths as string[],
    spendLimit,
    spendPeriod,
    expiresAt,
    agentName: normalizeAgentName(params.agent_name),
  };
};

export const parseRevokeSessionParams = (
  params: Record<string, unknown> | undefined,
): RevokeAgentSessionParams => {
  if (!params) {
    throw invalidParams('params are required');
  }
  return {
    sessionPublicKey: parseSessionPublicKey(params.session_public_key),
    agentName: normalizeAgentName(params.agent_name),
  };
};

export const toErrorResponse = (id: string, error: unknown): AgentHostResponse => {
  if (error instanceof AgentHostRequestError) {
    return { id, error: { code: error.code, message: error.message } };
  }
  const message = error instanceof Error ? error.message : 'unexpected error';
  return { id, error: { code: 'internal_error', message } };
};
