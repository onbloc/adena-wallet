import { Account, isSessionAccount } from 'adena-module';
import { NetworkMetainfo } from '@types';

// Chains where the MsgCreateSession protocol upgrade is deployed. As of
// 2026-05, only Gno test-13 supports account sessions; mainnet/staging/dev
// gno chains are explicitly excluded until the upgrade ships there.
const SESSION_SUPPORTED_CHAIN_IDS = new Set<string>(['test-13']);
const SESSION_MASTER_ACCOUNT_TYPES = new Set(['HD_WALLET', 'PRIVATE_KEY', 'WEB3_AUTH', 'LEDGER']);

export const isSessionSupportedNetwork = (
  network: NetworkMetainfo | undefined | null,
): boolean => {
  if (!network) return false;
  return SESSION_SUPPORTED_CHAIN_IDS.has(network.chainId);
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
