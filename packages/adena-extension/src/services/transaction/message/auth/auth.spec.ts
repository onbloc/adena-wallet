import { createMessageOfCreateSession } from './auth';

const baseInfo = {
  creator: 'g1masteraddress',
  sessionPublicKey: new Uint8Array(33).fill(1),
  expiresAt: 1,
  spendLimit: '1ugnot',
  spendPeriod: 0,
};

const createWithAllowPaths = (allowPaths: string[]) => {
  return createMessageOfCreateSession({
    ...baseInfo,
    allowPaths,
  });
};

describe('createMessageOfCreateSession allow_paths validation', () => {
  it('allows chain-whitelisted route/type entries without realm lookup paths', () => {
    const allowPaths = ['vm/exec', 'vm/run', 'bank/send', 'bank/multisend'];

    const message = createWithAllowPaths(allowPaths);

    expect(message.value.allow_paths).toEqual(allowPaths);
  });

  it('allows vm/exec entries with a realm path suffix', () => {
    const allowPaths = ['vm/exec:gno.land/r/demo'];

    const message = createWithAllowPaths(allowPaths);

    expect(message.value.allow_paths).toEqual(allowPaths);
  });

  it('returns JSON-safe session integer fields', () => {
    const message = createMessageOfCreateSession({
      ...baseInfo,
      expiresAt: BigInt('1779436464'),
      spendPeriod: BigInt(60),
      allowPaths: ['bank/send'],
    });

    expect(message.value.expires_at).toBe('1779436464');
    expect(message.value.spend_period).toBe('60');
    expect(() => JSON.stringify(message)).not.toThrow();
  });

  it('rejects bare routes and unknown route/type entries', () => {
    expect(() => createWithAllowPaths(['vm'])).toThrow(
      'must be one of *, vm/exec, vm/run, bank/send, bank/multisend',
    );
    expect(() => createWithAllowPaths(['bank'])).toThrow(
      'must be one of *, vm/exec, vm/run, bank/send, bank/multisend',
    );
  });

  it('rejects path suffixes outside vm/exec', () => {
    expect(() => createWithAllowPaths(['bank/send:gno.land/r/demo'])).toThrow(
      'can only include a path after vm/exec',
    );
  });

  it('rejects empty vm/exec path suffixes', () => {
    expect(() => createWithAllowPaths(['vm/exec:'])).toThrow('requires a non-empty path');
  });
});
