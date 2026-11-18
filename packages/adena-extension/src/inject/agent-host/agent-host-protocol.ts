import { fromBase64 } from 'adena-module';

import {
  validateTransactionMessageOfAddPkg,
  validateTransactionMessageOfBankSend,
  validateTransactionMessageOfRun,
  validateTransactionMessageOfVmCall,
} from '@common/validation/validation-message';

export const AGENT_HOST_NAME = 'xyz.onbloc.adena_agent';
export const AGENT_HOST_ENABLED_STORAGE_KEY = 'AGENT_HOST_ENABLED';
export const AGENT_HOST_STATUS_STORAGE_KEY = 'AGENT_HOST_STATUS';
export const AGENT_HOST_RELOAD_REQUIRED = 'reload_required';
// Off by default: agents sign with session accounts unless the user allows
// them to ask for master-account signatures directly.
export const AGENT_MASTER_REQUESTS_STORAGE_KEY = 'AGENT_HOST_ALLOW_MASTER_REQUESTS';
// The largest ugnot spend limit the user lets an agent session ask for.
export const AGENT_MAX_SPEND_LIMIT_STORAGE_KEY = 'AGENT_HOST_MAX_SPEND_LIMIT';
export const AGENT_DEFAULT_MAX_SPEND_LIMIT_UGNOT = '10000000';
// Hashes of the connection tokens issued to approved agent processes.
export const AGENT_CONNECTION_TOKENS_STORAGE_KEY = 'AGENT_HOST_CONNECTION_TOKENS';

// Agent sessions are bounded tighter than the chain allows: revoking needs the
// user, so a short expiry is what limits an abandoned session.
export const AGENT_SESSION_MAX_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
export const AGENT_SESSION_SPEND_DENOM = 'ugnot';

const MAX_AGENT_NAME_LENGTH = 32;
const SECP256K1_COMPRESSED_PUBKEY_LENGTH = 33;
const MAX_TRANSACTION_MESSAGES = 32;
const MAX_PEER_EXE_LENGTH = 4096;
const MAX_TOKEN_LENGTH = 256;
const UGNOT_AMOUNT_PATTERN = /^([0-9]+)ugnot$/;

export const AGENT_REQUEST_PROTOCOL = 'agent:';

export type AgentHostMethod =
  | 'ping'
  | 'get_status'
  | 'connect'
  | 'get_account'
  | 'create_session'
  | 'revoke_session'
  | 'send_transaction'
  | 'sign_transaction'
  | 'cancel';

// The process on the other end of the host socket, as seen by the host. The
// host overwrites anything a client sends here.
export interface AgentPeer {
  pid?: number;
  // Process start time, opaque. With pid it identifies one process.
  start?: string;
  exe?: string;
}

export interface AgentHostRequest {
  id: string;
  method: AgentHostMethod;
  params?: Record<string, unknown>;
  peer?: AgentPeer;
  // Issued by connect to the approved agent process; it proves the request
  // comes from that process.
  token?: string;
  // Set by the handler once the connection check passed: the account that
  // check authorized. Never parsed from the host.
  authorizedAccountId?: string;
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
  | 'not_connected'
  | 'master_requests_disabled'
  | 'approval_pending'
  | 'approval_timeout'
  | 'cancelled'
  | 'wallet_locked'
  | 'unsupported_account'
  | 'unsupported_network'
  | 'context_mismatch'
  | 'unidentified_agent'
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

// The account and chain the agent expects a session admin request to act on.
export interface AgentExpectedContext {
  masterAddress?: string;
  chainId?: string;
}

export interface CreateAgentSessionParams extends AgentExpectedContext {
  sessionPublicKey: Uint8Array;
  allowPaths: string[];
  spendLimit: string;
  spendPeriod: number;
  expiresAt: number;
  agentName: string;
}

export interface RevokeAgentSessionParams extends AgentExpectedContext {
  sessionPublicKey: Uint8Array;
  agentName: string;
}

export interface AgentTransactionMessage {
  type: string;
  value: Record<string, unknown>;
}

export interface AgentTransactionParams {
  messages: AgentTransactionMessage[];
  memo: string;
  gasWanted?: number;
  gasFee?: number;
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
  'get_status',
  'connect',
  'get_account',
  'create_session',
  'revoke_session',
  'send_transaction',
  'sign_transaction',
  'cancel',
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
    peer: parsePeer(raw.peer),
    token:
      typeof raw.token === 'string' && raw.token.length > 0 && raw.token.length <= MAX_TOKEN_LENGTH
        ? raw.token
        : undefined,
  };
};

const parsePeer = (value: unknown): AgentPeer | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const peer: AgentPeer = {};
  if (typeof value.pid === 'number' && Number.isSafeInteger(value.pid) && value.pid > 0) {
    peer.pid = value.pid;
  }
  if (typeof value.start === 'string' && value.start.length > 0 && value.start.length <= 64) {
    peer.start = value.start;
  }
  if (
    typeof value.exe === 'string' &&
    value.exe.length > 0 &&
    value.exe.length <= MAX_PEER_EXE_LENGTH
  ) {
    peer.exe = value.exe;
  }
  return peer;
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

const parseOptionalString = (value: unknown, name: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw invalidParams(`${name} must be a string`);
  }
  return value;
};

const parseExpectedContext = (params: Record<string, unknown>): AgentExpectedContext => ({
  masterAddress: parseOptionalString(params.master_address, 'master_address'),
  chainId: parseOptionalString(params.chain_id, 'chain_id'),
});

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

// Agent sessions may only spend ugnot, so the user's cap bounds every coin
// the session can move.
const parseSpendLimit = (value: unknown, maxUgnot: bigint): string => {
  const match = typeof value === 'string' ? UGNOT_AMOUNT_PATTERN.exec(value.trim()) : null;
  if (!match) {
    throw new AgentHostRequestError(
      'policy_violation',
      `spend_limit must be a single ${AGENT_SESSION_SPEND_DENOM} amount such as "5000000ugnot"`,
    );
  }
  const amount = BigInt(match[1]);
  if (amount <= BigInt(0)) {
    throw new AgentHostRequestError('policy_violation', 'spend_limit must be positive');
  }
  if (amount > maxUgnot) {
    throw new AgentHostRequestError(
      'policy_violation',
      `spend_limit exceeds the maximum the user allows for agent sessions (${maxUgnot}${AGENT_SESSION_SPEND_DENOM})`,
    );
  }
  return `${amount}${AGENT_SESSION_SPEND_DENOM}`;
};

export const parseCreateSessionParams = (
  params: Record<string, unknown> | undefined,
  nowSeconds: number,
  maxSpendUgnot: bigint,
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

  const spendLimit = parseSpendLimit(params.spend_limit, maxSpendUgnot);

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
    ...parseExpectedContext(params),
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
    ...parseExpectedContext(params),
  };
};

// The address field each message type takes from the signer.
const SIGNER_FIELDS: Record<string, string> = {
  '/vm.m_call': 'caller',
  '/vm.m_run': 'caller',
  '/vm.m_addpkg': 'creator',
  '/bank.MsgSend': 'from_address',
};

const MESSAGE_VALIDATORS: Record<string, (message: AgentTransactionMessage) => boolean> = {
  '/vm.m_call': validateTransactionMessageOfVmCall,
  '/vm.m_run': validateTransactionMessageOfRun,
  '/vm.m_addpkg': validateTransactionMessageOfAddPkg,
  '/bank.MsgSend': validateTransactionMessageOfBankSend,
};

const parseOptionalPositiveInteger = (value: unknown, name: string): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw invalidParams(`${name} must be a positive integer`);
  }
  return value;
};

// Parses the messages an agent asks the wallet to sign. Signer fields are
// filled with the master address when missing and must match it otherwise,
// so an agent cannot ask the user to sign for another account.
export const parseTransactionParams = (
  params: Record<string, unknown> | undefined,
  signerAddress: string,
): AgentTransactionParams => {
  if (!params) {
    throw invalidParams('params are required');
  }

  const { messages } = params;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw invalidParams('messages must be a non-empty array');
  }
  if (messages.length > MAX_TRANSACTION_MESSAGES) {
    throw invalidParams(`at most ${MAX_TRANSACTION_MESSAGES} messages are allowed`);
  }

  const parsed = messages.map((message, index): AgentTransactionMessage => {
    if (!isRecord(message) || typeof message.type !== 'string' || !isRecord(message.value)) {
      throw invalidParams(`messages[${index}] must be an object with type and value`);
    }

    const signerField = SIGNER_FIELDS[message.type];
    if (!signerField) {
      throw invalidParams(`messages[${index}]: unsupported type ${message.type}`);
    }

    const current = message.value[signerField];
    if (current !== undefined && current !== '' && current !== signerAddress) {
      throw invalidParams(`messages[${index}].value.${signerField} must be the wallet address`);
    }

    const value: Record<string, unknown> = { ...message.value, [signerField]: signerAddress };
    if (message.type === '/vm.m_call') {
      value.send = typeof value.send === 'string' ? value.send : '';
      value.args = Array.isArray(value.args) ? value.args : [];
    }
    if (message.type === '/vm.m_run') {
      value.send = typeof value.send === 'string' ? value.send : '';
    }

    const normalized = { type: message.type, value };
    if (!MESSAGE_VALIDATORS[message.type](normalized)) {
      throw invalidParams(`messages[${index}] is not a valid ${message.type} message`);
    }
    return normalized;
  });

  const memo = params.memo === undefined ? '' : params.memo;
  if (typeof memo !== 'string') {
    throw invalidParams('memo must be a string');
  }

  return {
    messages: parsed,
    memo,
    gasWanted: parseOptionalPositiveInteger(params.gas_wanted, 'gas_wanted'),
    gasFee: parseOptionalPositiveInteger(params.gas_fee, 'gas_fee'),
  };
};

// The connected-sites key an agent is stored under.
export const agentSiteName = (agentName: string): string =>
  `${AGENT_REQUEST_PROTOCOL}//${agentName}.agent`;

export const parseCancelParams = (params: Record<string, unknown> | undefined): string => {
  const requestId = params?.request_id;
  if (typeof requestId !== 'string' || requestId.length === 0) {
    throw invalidParams('request_id is required');
  }
  return requestId;
};

export const toErrorResponse = (id: string, error: unknown): AgentHostResponse => {
  if (error instanceof AgentHostRequestError) {
    return { id, error: { code: error.code, message: error.message } };
  }
  const message = error instanceof Error ? error.message : 'unexpected error';
  return { id, error: { code: 'internal_error', message } };
};
