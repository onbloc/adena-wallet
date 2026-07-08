import { Account, isSessionAccount } from 'adena-module';
import { SESSION_UNSUPPORTED_CHAIN_IDS } from '@common/constants/chain.constant';
import { NetworkMetainfo } from '@types';

const SESSION_MASTER_ACCOUNT_TYPES = new Set(['HD_WALLET', 'PRIVATE_KEY', 'WEB3_AUTH', 'LEDGER']);

// Sessions are supported everywhere except the chains on the denylist. Both
// predicates below read that one list so the screen that creates a session and
// the screens that consume one can never disagree about a chain.
export const isSessionSupportedChainId = (chainId: string): boolean => {
  return !SESSION_UNSUPPORTED_CHAIN_IDS.includes(chainId);
};

export const isSessionSupportedNetwork = (
  network: NetworkMetainfo | undefined | null,
): boolean => {
  if (!network) return false;
  return isSessionSupportedChainId(network.chainId);
};

export const isSessionMasterAccount = (account: Account): boolean => {
  return !isSessionAccount(account) && SESSION_MASTER_ACCOUNT_TYPES.has(account.type);
};

interface SessionStatusEntry {
  sessionAddr: string;
  status: string;
}

// True when `account` is a SessionAccount whose SESSIONS row is flagged
// REVOKED. `address` must be the account's own session address, not the master
// address. Shared by every revoked-state surface so they agree on one rule.
export const isRevokedSessionAccount = (
  account: Account | null | undefined,
  address: string | null | undefined,
  sessions: readonly SessionStatusEntry[],
): boolean => {
  if (!account || !isSessionAccount(account) || !address) {
    return false;
  }
  return sessions.find((session) => session.sessionAddr === address)?.status === 'REVOKED';
};
