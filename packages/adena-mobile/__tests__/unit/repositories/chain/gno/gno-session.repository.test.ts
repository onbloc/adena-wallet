import { toBase64 } from '@cosmjs/encoding';

import { Network } from '../../../../../src/domain/network';
import { GnoProvider } from '../../../../../src/repositories/chain/gno/gno-provider';
import { GnoSessionRepository, toChainSession } from '../../../../../src/repositories/chain/gno/gno-session.repository';

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

describe('GnoSessionRepository queries', () => {
  const NETWORK = { rpcUrl: 'rpc', nativeToken: { denom: 'ugnot' } } as Network;

  const repositoryAnswering = (data: string | null): GnoSessionRepository => {
    const provider = { abciQuery: async () => ({ response: { ResponseBase: { Data: data === null ? null : toBase64(new TextEncoder().encode(data)) } } }) };

    return new GnoSessionRepository(async () => provider as unknown as GnoProvider);
  };

  // The node answers JSON null for a master without sessions.
  it('treats null and empty answers as no sessions', async () => {
    await expect(repositoryAnswering('null').listSessions('g1master', NETWORK)).resolves.toEqual([]);
    await expect(repositoryAnswering('').listSessions('g1master', NETWORK)).resolves.toEqual([]);
    await expect(repositoryAnswering(null).listSessions('g1master', NETWORK)).resolves.toEqual([]);
    await expect(repositoryAnswering('null').findSession('g1master', 'g1session', NETWORK)).resolves.toBeNull();
    await expect(repositoryAnswering(null).findSession('g1master', 'g1session', NETWORK)).resolves.toBeNull();
  });

  it('reads the nested session account the node returns', async () => {
    const raw = JSON.stringify([{
      BaseSessionAccount: {
        BaseAccount: { address: 'g1session', coins: '', public_key: null, account_number: '9', sequence: '0' },
        master_address: 'g1master',
        expires_at: '1790000000',
        spend_limit: '2000000ugnot',
        spend_period: '86400',
        spend_used: '300ugnot',
        spend_reset: '1789990000',
      },
      allow_paths: ['vm/exec:gno.land/r/demo/x'],
    }]);

    await expect(repositoryAnswering(raw).listSessions('g1master', NETWORK)).resolves.toEqual([{
      address: 'g1session',
      masterAddress: 'g1master',
      publicKey: undefined,
      allowPaths: ['vm/exec:gno.land/r/demo/x'],
      spendLimit: '2000000',
      spendUsed: '300',
      spendPeriod: 86400,
      spendResetAt: 1789990000,
      expiresAt: 1790000000,
    }]);
  });
});
