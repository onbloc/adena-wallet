import { Account } from 'adena-module';

import {
  isRevokedSessionAccount,
  isSessionMasterAccount,
  isSessionSupportedNetwork,
} from './account-session';

const accountOf = (type: Account['type']): Account =>
  ({
    id: type,
    index: 0,
    type,
    name: type,
    keyringId: type,
    publicKey: new Uint8Array(),
    toData: jest.fn(),
    getAddress: jest.fn(),
  }) as unknown as Account;

describe('account session utils', () => {
  it.each(['HD_WALLET', 'PRIVATE_KEY', 'WEB3_AUTH', 'LEDGER'] as Account['type'][])(
    'allows %s as a session master account',
    (type) => {
      expect(isSessionMasterAccount(accountOf(type))).toBe(true);
    },
  );

  it.each(['SESSION', 'MULTISIG', 'AIRGAP'] as Account['type'][])(
    'blocks %s as a session master account',
    (type) => {
      expect(isSessionMasterAccount(accountOf(type))).toBe(false);
    },
  );

  it('keeps session support limited to deployed chain ids', () => {
    expect(isSessionSupportedNetwork({ chainId: 'test-13' } as never)).toBe(true);
    expect(isSessionSupportedNetwork({ chainId: 'portal-loop' } as never)).toBe(false);
  });

  describe('isRevokedSessionAccount', () => {
    const sessionAddr = 'g1session';
    const revoked = [{ sessionAddr, status: 'REVOKED' }];

    it('flags a session account whose row is REVOKED', () => {
      expect(isRevokedSessionAccount(accountOf('SESSION'), sessionAddr, revoked)).toBe(true);
    });

    it('does not flag a session account whose row is ACTIVE', () => {
      const active = [{ sessionAddr, status: 'ACTIVE' }];
      expect(isRevokedSessionAccount(accountOf('SESSION'), sessionAddr, active)).toBe(false);
    });

    it('does not flag a session account with no matching row', () => {
      expect(isRevokedSessionAccount(accountOf('SESSION'), 'g1other', revoked)).toBe(false);
    });

    it('does not flag non-session accounts', () => {
      expect(isRevokedSessionAccount(accountOf('HD_WALLET'), sessionAddr, revoked)).toBe(false);
    });

    it('does not flag while the account or address is unresolved', () => {
      expect(isRevokedSessionAccount(accountOf('SESSION'), null, revoked)).toBe(false);
      expect(isRevokedSessionAccount(null, sessionAddr, revoked)).toBe(false);
    });
  });
});
