import { Account } from 'adena-module';

import {
  isRevokedSessionAccount,
  isSessionMasterAccount,
  isSessionSupportedChainId,
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

  // Denylist, not allowlist: a chain opts out explicitly, so custom and future
  // networks are supported by default.
  it('supports every chain except the denylisted ones', () => {
    expect(isSessionSupportedNetwork({ chainId: 'test-13' } as never)).toBe(true);
    expect(isSessionSupportedNetwork({ chainId: 'portal-loop' } as never)).toBe(true);
    expect(isSessionSupportedNetwork({ chainId: 'gnoland1' } as never)).toBe(false);
  });

  it('treats a missing network as unsupported', () => {
    expect(isSessionSupportedNetwork(null)).toBe(false);
    expect(isSessionSupportedNetwork(undefined)).toBe(false);
  });

  it('exposes the same rule for a bare chain id', () => {
    expect(isSessionSupportedChainId('test-13')).toBe(true);
    expect(isSessionSupportedChainId('gnoland1')).toBe(false);
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
