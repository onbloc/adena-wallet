// A stand-in wallet for the agent's own tests. It owns no data model (no token list, no balances):
// it records what the tools ask of it and answers like a wallet that resolved the arguments.
import { TransactionType } from '../wallet/constants';
import type { Allowance, Contact, WalletSdk } from '../wallet/port';

export const ACCOUNT = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
export const RECIPIENT = 'g1l7aum6echk45nj3s0wdvt2fg8x9yrzpql7aum6';
export const FRIEND: Contact = { alias: 'carol', address: 'g1tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s' };

export type FakeWalletOptions = {
  /** What `transfer` and `approve` throw, e.g. a WalletError. */
  failWith?: Error;
  /** Offer `approve`. Defaults to true. */
  approve?: boolean;
  /** Offer `getAllowances`, answering these. */
  allowances?: Allowance[];
  /** Offer `getContacts`, answering these. */
  contacts?: Contact[];
};

/** The calls the wallet got, oldest first. */
export type FakeWalletCall = { method: 'transfer' | 'approve'; params: Record<string, string> };

export function fakeWallet({ failWith, approve = true, allowances, contacts }: FakeWalletOptions = {}) {
  const calls: FakeWalletCall[] = [];
  // As a wallet would: lowercase addresses, upper-case symbol.
  const resolved = (params: Record<string, string>) => ({
    chainId: 'test-chain',
    from: params.from.toLowerCase(),
    amount: params.amount,
    token: params.token.trim().toUpperCase(),
  });
  const wallet: WalletSdk & { calls: FakeWalletCall[] } = {
    calls,
    async transfer(params) {
      calls.push({ method: 'transfer', params });
      if (failWith) throw failWith;
      return {
        summary: { type: TransactionType.Transfer, ...resolved(params), to: params.to.toLowerCase() },
        tx: { fake: 'transfer' },
      };
    },
    ...(approve && {
      async approve(params: Parameters<NonNullable<WalletSdk['approve']>>[0]) {
        calls.push({ method: 'approve', params });
        if (failWith) throw failWith;
        return {
          summary: { type: TransactionType.Allowance, ...resolved(params), spender: params.spender.toLowerCase() },
          tx: { fake: 'approve' },
        };
      },
    }),
    ...(allowances && { getAllowances: async () => allowances }),
    ...(contacts && { getContacts: async () => contacts }),
  };
  return wallet;
}
