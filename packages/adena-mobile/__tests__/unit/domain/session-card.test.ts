import {
  CardDuration,
  cardRestrictions,
  CardStatus,
  ChainSession,
  coversPath,
  effectiveSpendUsed,
  formatRemaining,
  formatTimeLeft,
  parseAllowPath,
  realmPathError,
  SpendPeriod,
  spendResetsAt,
  toAllowPath,
  toSessionCard,
  validateCardPolicy,
} from '../../../src/domain/session-card';

const NOW = 1_800_000_000;

const session = (overrides: Partial<ChainSession> = {}): ChainSession => ({
  address: 'g1session',
  masterAddress: 'g1master',
  allowPaths: ['vm/exec:gno.land/r/demo/x'],
  spendLimit: '1000',
  spendUsed: '400',
  spendPeriod: SpendPeriod.DAILY,
  spendResetAt: NOW - 100,
  expiresAt: NOW + 3600,
  accountNumber: '9',
  sequence: '0',
  ...overrides,
});

describe('allow paths', () => {
  it('round-trips the entries the wallet issues', () => {
    expect(toAllowPath({ kind: 'realm', path: 'gno.land/r/demo/x' })).toBe('vm/exec:gno.land/r/demo/x');
    expect(toAllowPath({ kind: 'send' })).toBe('bank/send');
    expect(parseAllowPath('vm/exec:gno.land/r/demo/x')).toEqual({ kind: 'realm', path: 'gno.land/r/demo/x' });
    expect(parseAllowPath('bank/send')).toEqual({ kind: 'send' });
  });

  it('keeps wildcards, bare vm/exec and vm/run as foreign entries', () => {
    expect(parseAllowPath('*')).toEqual({ kind: 'other', raw: '*' });
    expect(parseAllowPath('vm/exec')).toEqual({ kind: 'other', raw: 'vm/exec' });
    expect(parseAllowPath('vm/run')).toEqual({ kind: 'other', raw: 'vm/run' });
    expect(parseAllowPath('vm/exec:')).toEqual({ kind: 'other', raw: 'vm/exec:' });
  });

  it('accepts only concrete realm paths', () => {
    expect(realmPathError('gno.land/r/gnoswap')).toBeNull();
    expect(realmPathError('gno.land/r/gnoswap/v1/router')).toBeNull();
    expect(realmPathError('')).not.toBeNull();
    expect(realmPathError('gno.land/p/demo/avl')).not.toBeNull();
    expect(realmPathError('gno.land/r/')).not.toBeNull();
    expect(realmPathError('gno.land/r/demo/')).not.toBeNull();
    expect(realmPathError('gno.land/r/Demo')).not.toBeNull();
    expect(realmPathError('gno.land/r/demo x')).not.toBeNull();
    expect(realmPathError('*')).not.toBeNull();
  });

  // Mirrors the chain: exact path or a sub-path behind "/", never a longer name.
  it('matches sub-paths like the chain', () => {
    expect(coversPath('gno.land/r/gnoswap', 'gno.land/r/gnoswap')).toBe(true);
    expect(coversPath('gno.land/r/gnoswap', 'gno.land/r/gnoswap/router')).toBe(true);
    expect(coversPath('gno.land/r/gnoswap', 'gno.land/r/gnoswapx')).toBe(false);
  });
});

describe('validateCardPolicy', () => {
  const valid = {
    name: 'Bot',
    permissions: [{ kind: 'realm' as const, path: 'gno.land/r/demo/x' }],
    spendLimit: '1',
    spendPeriod: SpendPeriod.TOTAL,
    duration: CardDuration.ONE_DAY,
  };

  it('accepts a complete policy', () => {
    expect(validateCardPolicy(valid)).toEqual([]);
  });

  it('reports each problem', () => {
    expect(validateCardPolicy({ ...valid, name: '  ' })).toEqual(['name']);
    expect(validateCardPolicy({ ...valid, permissions: [] })).toEqual(['permissions']);
    expect(validateCardPolicy({ ...valid, permissions: Array.from({ length: 9 }, (_, i) => ({ kind: 'realm' as const, path: `gno.land/r/demo/x${i}` })) })).toEqual(['tooManyPermissions']);
    expect(validateCardPolicy({ ...valid, spendLimit: '0' })).toEqual(['spendLimit']);
    expect(validateCardPolicy({ ...valid, spendLimit: '1.5' })).toEqual(['spendLimit']);
    expect(validateCardPolicy({ ...valid, spendPeriod: SpendPeriod.WEEKLY })).toEqual(['spendPeriod']);
  });
});

describe('card state', () => {
  it('counts spend only within the current period', () => {
    expect(effectiveSpendUsed(session(), NOW)).toBe('400');
    expect(effectiveSpendUsed(session({ spendResetAt: NOW - SpendPeriod.DAILY }), NOW)).toBe('0');
    expect(effectiveSpendUsed(session({ spendPeriod: 0, spendResetAt: NOW - 10 * SpendPeriod.DAILY }), NOW)).toBe('400');
  });

  it('reports when the period resets', () => {
    expect(spendResetsAt(session(), NOW)).toBe(NOW - 100 + SpendPeriod.DAILY);
    expect(spendResetsAt(session({ spendPeriod: 0 }), NOW)).toBeUndefined();
    expect(spendResetsAt(session({ spendResetAt: NOW - SpendPeriod.DAILY }), NOW)).toBeUndefined();
  });

  it('expires at expires_at, never with zero', () => {
    expect(toSessionCard(session(), undefined, NOW).status).toBe(CardStatus.ACTIVE);
    expect(toSessionCard(session({ expiresAt: NOW }), undefined, NOW).status).toBe(CardStatus.EXPIRED);
    expect(toSessionCard(session({ expiresAt: 0 }), undefined, NOW).status).toBe(CardStatus.ACTIVE);
  });

  it('formats remaining time', () => {
    expect(formatRemaining(30)).toBe('1 minute');
    expect(formatRemaining(2 * 3600 + 5)).toBe('2 hours');
    expect(formatRemaining(86400)).toBe('1 day');
    expect(formatTimeLeft(NOW + 3 * 86400, NOW)).toBe('3 days left');
    expect(formatTimeLeft(NOW - 1, NOW)).toBe('Expired');
    expect(formatTimeLeft(0, NOW)).toBe('No expiry');
  });

  it('lists what a card can never do', () => {
    expect(cardRestrictions([{ kind: 'realm', path: 'gno.land/r/demo/x' }])).toEqual(['Create or revoke cards', 'Deploy code', 'Run scripts', 'Send GNOT']);
    expect(cardRestrictions([{ kind: 'send' }])).toEqual(['Create or revoke cards', 'Deploy code', 'Run scripts']);
    expect(cardRestrictions([{ kind: 'other', raw: '*' }])).toEqual(['Create or revoke cards', 'Deploy code']);
  });
});
