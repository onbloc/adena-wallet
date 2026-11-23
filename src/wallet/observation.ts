import type { CallRecord } from '../llm/calls';
import { FIXTURE } from './sdk/fixture';
import type { ApprovalRecord } from './sdk/mockWalletSdk';
import type { Allowance, Balances, WalletSdk } from './sdk/types';

/** Everything a scenario run is judged on. */
export type RunObservation = {
  calls: CallRecord[];
  /** The model's final text. */
  answer: string;
  /** Signing popups shown during the run. */
  approvals: readonly ApprovalRecord[];
  /** Balances after the run, by address. */
  balances: Record<string, Balances>;
  /** The user's allowances after the run. */
  allowances: readonly Allowance[];
};

/** Accounts whose balances scenarios may check, with a label for the UI. */
export const WATCHED = [
  ...FIXTURE.accounts.map((account) => ({ label: account.name, address: account.address })),
  ...FIXTURE.contacts.map((contact) => ({ label: contact.alias, address: contact.address })),
  { label: 'recipient', address: FIXTURE.recipient },
];

export const WATCHED_ADDRESSES = WATCHED.map((watched) => watched.address);

export async function snapshotBalances(
  sdk: WalletSdk,
  addresses: readonly string[] = WATCHED_ADDRESSES
): Promise<Record<string, Balances>> {
  const entries = await Promise.all(
    addresses.map(async (address) => [address, await sdk.getBalance(address)] as const)
  );
  return Object.fromEntries(entries);
}
