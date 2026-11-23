import { TokenSymbol } from '../constants';
import type { Balances } from './types';

export type MockAccount = {
  name: string;
  address: string;
  balances: Balances;
};

// Example data for scenarios; the values are assumptions, not real Gno.land data.
export const FIXTURE = {
  accounts: [
    {
      name: 'Account 1',
      address: 'g1qpzry9x8gf2tvdw0s3jn54khce6mua7lqpzry9',
      balances: { [TokenSymbol.Gnot]: '10', [TokenSymbol.Gns]: '250' },
    },
    {
      name: 'Account 2',
      address: 'g19x8gf2tvdw0s3jn54khce6mua7lqpzry9x8gf2',
      balances: { [TokenSymbol.Gnot]: '1.5', [TokenSymbol.Gns]: '0' },
    },
  ] satisfies MockAccount[],
  contacts: [
    { alias: 'alice', address: 'g1tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s' },
  ],
  /** An address that is in nobody's contacts; used as a recipient in scenarios. */
  recipient: 'g1l7aum6echk45nj3s0wdvt2fg8x9yrzpql7aum6',
};

/** The account the user is acting as: the harness injects its address. */
export const ACTIVE_ADDRESS = FIXTURE.accounts[0].address;
