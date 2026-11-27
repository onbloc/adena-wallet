import { TokenSymbol, type Balances } from './tokens';

export type MockAccount = {
  name: string;
  address: string;
  balances: Balances;
};

// Example data for tests and the prompt's contacts; the values are assumptions, not real Gno.land data.
export const FIXTURE = {
  // Only the user's own account has funds; every other address starts at zero.
  accounts: [
    {
      name: 'Account 1',
      address: 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v',
      balances: { [TokenSymbol.Gnot]: '10', [TokenSymbol.Gns]: '250' },
    },
  ] satisfies MockAccount[],
  contacts: [
    { alias: 'alice', address: 'g1tvdw0s3jn54khce6mua7lqpzry9x8gf2u50rw9' },
  ],
  /** An address that is in nobody's contacts; used as a recipient in tests. */
  recipient: 'g1l7aum6echk45nj3s0wdvt2fg8x9yrzpqcg7v29',
};

/** The account the user is acting as: the harness injects its address. */
export const ACTIVE_ADDRESS = FIXTURE.accounts[0].address;
