import { Account } from 'adena-module';

import { isSessionMasterAccount, isSessionSupportedNetwork } from './account-session';

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
});
