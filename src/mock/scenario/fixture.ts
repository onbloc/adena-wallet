// What every scenario run shares: one account, one contact and fixed Onbloc reads. Portable: it
// runs in the app as well as in jest.
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';

export const ACCOUNT = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
export const RECIPIENT = 'g1l7aum6echk45nj3s0wdvt2fg8x9yrzpql7aum6';
export const CAROL = 'g1tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s';
export const GNS_PATH = 'gno.land/r/gnoswap/gns';

/** Never contacted: the fake MCP answers in process. */
export const FAKE_ENDPOINT = 'https://example.test/mcp';

// The account holds 10 GNOT and 250 GNS, both with six decimals.
const GNOT_UNITS = '10000000';
const GNS = { address: ACCOUNT, tokenId: GNS_PATH, packagePath: GNS_PATH, symbol: 'GNS', amount: '250000000', decimals: 6 };

/** A fresh in-process Onbloc MCP with the account's fixed balances. */
export const fakeReads = () =>
  fakeOnblocMcp([
    { name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: GNOT_UNITS } },
    { name: 'get_token_balances', output: { address: ACCOUNT, items: [GNS] } },
  ]);
