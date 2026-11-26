import { toChainSession } from '../../../../../src/repositories/chain/gno/gno-session.repository';

describe('toChainSession', () => {
  it('reads native amounts and the amino public key', () => {
    expect(toChainSession({
      address: 'g1session',
      master_address: 'g1master',
      public_key: { '@type': '/tm.PubKeySecp256k1', value: 'AqKey' },
      expires_at: 100,
      spend_limit: '5000ugnot,10foo',
      spend_used: '7ugnot',
      spend_period: 60,
      spend_reset: 40,
      allow_paths: ['bank/send'],
    }, 'ugnot')).toEqual({
      address: 'g1session',
      masterAddress: 'g1master',
      publicKey: 'AqKey',
      allowPaths: ['bank/send'],
      spendLimit: '5000',
      spendUsed: '7',
      spendPeriod: 60,
      spendResetAt: 40,
      expiresAt: 100,
    });
  });

  it('treats missing fields as their chain zero values', () => {
    expect(toChainSession({ address: 'g1s', master_address: 'g1m', public_key: null }, 'ugnot')).toEqual({
      address: 'g1s',
      masterAddress: 'g1m',
      publicKey: undefined,
      allowPaths: [],
      spendLimit: '0',
      spendUsed: '0',
      spendPeriod: 0,
      spendResetAt: 0,
      expiresAt: 0,
    });
  });
});
