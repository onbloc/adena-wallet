import { Account, isSessionAccount } from 'adena-module';

import { SessionMetadataV020 } from '@migrates/migrations/v020/storage-model-v020';

import {
  allMessagesMatchAllowPaths,
  DecodedMessageForGuard,
} from './session-allow-paths';
import {
  addCoins,
  Coins,
  DecodedMessageForSpend,
  effectiveSpendUsed,
  estimateSessionSpend,
  isAllGTE,
  parseCoins,
  SpendTxFee,
} from './session-spend';

const SESSION_ADMIN_MSG_TYPES = new Set([
  '/auth.m_create_session',
  '/auth.m_revoke_session',
  '/auth.m_revoke_all_sessions',
]);

const SUPPORTED_SESSION_MSG_TYPES = new Set([
  '/vm.m_call',
  '/vm.m_run',
  '/bank.MsgSend',
  '/bank.MsgMultiSend',
]);

export type SessionSigningFailReason =
  | 'wallet_locked'
  | 'not_session_account'
  | 'session_admin_msg'
  | 'session_metadata_missing'
  | 'session_inactive'
  | 'chain_mismatch'
  | 'session_expired'
  | 'unsupported_msg_type'
  | 'allowpaths_violation'
  | 'spendlimit_exceeded';

export type SessionSigningGuardDecision =
  | { ok: true }
  | { ok: false; reason: SessionSigningFailReason };

export interface SessionSigningGuardInput {
  currentAccount: Account;
  sessionMetadata: SessionMetadataV020 | null;
  walletLocked: boolean;
  nowSeconds: number;
  currentChainId: string;
  decodedMessages: (DecodedMessageForGuard & DecodedMessageForSpend)[];
  txFee: SpendTxFee;
}

// evaluate runs the 10-step gate (see plans/account-sessions/phase-05).
// Order matters: cheaper checks first, so we don't compute SpendLimit
// before establishing that this is even a session signing flow.
export function evaluateSessionSigningGuard(
  input: SessionSigningGuardInput,
): SessionSigningGuardDecision {
  const {
    currentAccount,
    sessionMetadata,
    walletLocked,
    nowSeconds,
    currentChainId,
    decodedMessages,
    txFee,
  } = input;

  // 1. Wallet lock: handled by popup ApproveLogin redirect; guard returns
  //    'wallet_locked' so callers can keep the request alive and re-evaluate
  //    after unlock. This is NOT a terminal rejection from dApp's view.
  if (walletLocked) {
    return { ok: false, reason: 'wallet_locked' };
  }

  if (!isSessionAccount(currentAccount)) {
    return { ok: false, reason: 'not_session_account' };
  }

  // 2. Session admin messages (create/revoke) must NEVER be auto-signed by
  //    a session key. They mutate the master's session store and require
  //    explicit master confirmation.
  for (const m of decodedMessages) {
    if (SESSION_ADMIN_MSG_TYPES.has(m.type)) {
      return { ok: false, reason: 'session_admin_msg' };
    }
  }

  if (sessionMetadata == null) {
    return { ok: false, reason: 'session_metadata_missing' };
  }

  if (sessionMetadata.status !== 'ACTIVE') {
    return { ok: false, reason: 'session_inactive' };
  }

  // 3. chainId guard is the last-resort safety net; the UI guards (session
  //    visibility filter + network switch block) should make this state
  //    unreachable, but we double-check here so a desynced UI can't slip
  //    a wrong-chain session into the sign path.
  if (sessionMetadata.chainId !== currentChainId) {
    return { ok: false, reason: 'chain_mismatch' };
  }

  if (sessionMetadata.expiresAt > 0 && nowSeconds >= sessionMetadata.expiresAt) {
    return { ok: false, reason: 'session_expired' };
  }

  for (const m of decodedMessages) {
    if (!SUPPORTED_SESSION_MSG_TYPES.has(m.type)) {
      return { ok: false, reason: 'unsupported_msg_type' };
    }
  }

  if (!allMessagesMatchAllowPaths(decodedMessages, sessionMetadata.allowPaths)) {
    return { ok: false, reason: 'allowpaths_violation' };
  }

  if (sessionMetadata.spendLimit && sessionMetadata.spendLimit !== '') {
    try {
      const limit = parseCoins(sessionMetadata.spendLimit);
      const used = effectiveSpendUsed(
        sessionMetadata.spendUsed,
        sessionMetadata.spendReset,
        sessionMetadata.spendPeriod,
        nowSeconds,
      );
      const projected = estimateSessionSpend(
        decodedMessages,
        txFee,
        sessionMetadata.masterAddress,
      );
      const next: Coins = addCoins(used, projected);
      if (!isAllGTE(limit, next)) {
        return { ok: false, reason: 'spendlimit_exceeded' };
      }
    } catch {
      // Defensive: any parse failure in stored coin strings means we can't
      // verify safely. Block and force master review rather than silently
      // pass.
      return { ok: false, reason: 'spendlimit_exceeded' };
    }
  }

  return { ok: true };
}
