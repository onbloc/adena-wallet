import { Account } from 'adena-module';

import {
  getDappVisibleAddress,
  getWalletFundingAddress,
  selectBalanceAddress,
} from './account-address';

const masterAddress = 'g1masteraddress';
const sessionAddress = 'g1sessionaddress';
const regularAddress = 'g1regularaddress';

function makeSessionAccount(): Account {
  return {
    id: 'session-account',
    index: 0,
    type: 'SESSION',
    name: 'Session',
    keyringId: 'session-keyring',
    publicKey: new Uint8Array(),
    toData: jest.fn(),
    getAddress: jest.fn().mockResolvedValue(sessionAddress),
    getMasterAddress: jest.fn().mockReturnValue(masterAddress),
  } as unknown as Account;
}

function makeRegularAccount(): Account {
  return {
    id: 'regular-account',
    index: 0,
    type: 'HD_WALLET',
    name: 'Regular',
    keyringId: 'regular-keyring',
    publicKey: new Uint8Array(),
    toData: jest.fn(),
    getAddress: jest.fn().mockResolvedValue(regularAddress),
  } as unknown as Account;
}

describe('account address helpers', () => {
  it('exposes the master address for session accounts', async () => {
    const account = makeSessionAccount();

    await expect(getDappVisibleAddress(account, 'g')).resolves.toBe(masterAddress);
    await expect(getWalletFundingAddress(account, 'g')).resolves.toBe(masterAddress);
  });

  it('uses the derived address for regular accounts', async () => {
    const account = makeRegularAccount();

    await expect(getDappVisibleAddress(account, 'g')).resolves.toBe(regularAddress);
    await expect(getWalletFundingAddress(account, 'g')).resolves.toBe(regularAddress);
  });

  describe('selectBalanceAddress', () => {
    it('shows the funding balance while the session is active', () => {
      expect(selectBalanceAddress(sessionAddress, masterAddress, false)).toBe(masterAddress);
    });

    it('shows the session key balance once revoked', () => {
      expect(selectBalanceAddress(sessionAddress, masterAddress, true)).toBe(sessionAddress);
    });

    it('is a no-op for accounts whose addresses coincide', () => {
      expect(selectBalanceAddress(regularAddress, regularAddress, false)).toBe(regularAddress);
    });

    it('propagates a null address', () => {
      expect(selectBalanceAddress(null, null, true)).toBeNull();
    });
  });
});
