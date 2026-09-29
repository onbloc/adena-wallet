import { ABCIAccountVesting } from '@common/provider/gno';

import {
  getVestedAmount,
  getVestingBreakdown,
  parseUgnotCoins,
  parseVestingSchedule,
  VestingSchedule,
} from './vesting-utils';

// The account used in ADN-820: a 106,560 GNOT linear grant over ~2 years.
const START_TIME = 1789225200;
const END_TIME = 1852383600;
const ORIGINAL_VESTING = '106560000000ugnot';

const VESTING_ACCOUNT: ABCIAccountVesting = {
  original_vesting: ORIGINAL_VESTING,
  start_time: `${START_TIME}`,
  end_time: `${END_TIME}`,
};

// The cases below all describe a valid grant, so a null schedule is a test
// failure rather than something to narrow away at every call site.
const requireSchedule = (vesting: ABCIAccountVesting): VestingSchedule => {
  const schedule = parseVestingSchedule(vesting);
  if (!schedule) {
    throw new Error(`expected a vesting schedule for ${JSON.stringify(vesting)}`);
  }
  return schedule;
};

describe('parseUgnotCoins', () => {
  it('reads the ugnot amount from a single-denom coin string', () => {
    expect(parseUgnotCoins('110294549738ugnot').toFixed()).toBe('110294549738');
  });

  it('picks ugnot out of a multi-denom coin string', () => {
    expect(parseUgnotCoins('5foo,110294549738ugnot').toFixed()).toBe('110294549738');
  });

  it('keeps full precision beyond the safe-integer range', () => {
    expect(parseUgnotCoins('90071992547409910ugnot').toFixed()).toBe('90071992547409910');
  });

  it('returns zero for empty, missing, or non-ugnot balances', () => {
    expect(parseUgnotCoins('').toFixed()).toBe('0');
    expect(parseUgnotCoins(undefined).toFixed()).toBe('0');
    expect(parseUgnotCoins('5foo').toFixed()).toBe('0');
  });
});

describe('parseVestingSchedule', () => {
  it('normalises a continuous schedule', () => {
    const schedule = parseVestingSchedule(VESTING_ACCOUNT);

    expect(schedule).not.toBeNull();
    expect(schedule?.originalVesting.toFixed()).toBe('106560000000');
    expect(schedule?.startTime).toBe(START_TIME);
    expect(schedule?.endTime).toBe(END_TIME);
    expect(schedule?.type).toBe('continuous');
  });

  it('normalises a delayed (cliff) schedule', () => {
    const schedule = parseVestingSchedule({
      original_vesting: ORIGINAL_VESTING,
      end_time: `${END_TIME}`,
      type: 'delayed',
    });

    expect(schedule?.type).toBe('delayed');
  });

  it('returns null when the account has no grant', () => {
    expect(parseVestingSchedule(undefined)).toBeNull();
    expect(
      parseVestingSchedule({ original_vesting: '0ugnot', end_time: `${END_TIME}` }),
    ).toBeNull();
  });

  it('returns null when the schedule has no end time', () => {
    expect(parseVestingSchedule({ original_vesting: ORIGINAL_VESTING })).toBeNull();
  });

  // The chain rejects such a schedule at genesis, so rather than dividing by a
  // non-positive span it is read as a cliff at end_time.
  it('falls back to a cliff when the start is not before the end', () => {
    const schedule = parseVestingSchedule({
      original_vesting: ORIGINAL_VESTING,
      start_time: `${END_TIME}`,
      end_time: `${END_TIME}`,
    });

    expect(schedule?.type).toBe('delayed');
  });
});

describe('getVestedAmount', () => {
  const schedule = requireSchedule(VESTING_ACCOUNT);

  it('vests nothing before the start time', () => {
    expect(getVestedAmount(schedule, START_TIME - 1).toFixed()).toBe('0');
    expect(getVestedAmount(schedule, START_TIME).toFixed()).toBe('0');
  });

  it('vests everything at and after the end time', () => {
    expect(getVestedAmount(schedule, END_TIME).toFixed()).toBe('106560000000');
    expect(getVestedAmount(schedule, END_TIME + 10_000).toFixed()).toBe('106560000000');
  });

  it('vests a truncated linear share in between, matching the chain', () => {
    const midpoint = START_TIME + Math.floor((END_TIME - START_TIME) / 2);
    const elapsed = midpoint - START_TIME;
    const span = END_TIME - START_TIME;
    const expected = Math.floor((106560000000 * elapsed) / span);

    expect(getVestedAmount(schedule, midpoint).toFixed()).toBe(`${expected}`);
  });

  it('vests nothing before a cliff ends', () => {
    const cliff = requireSchedule({
      original_vesting: ORIGINAL_VESTING,
      end_time: `${END_TIME}`,
      type: 'delayed',
    });

    expect(getVestedAmount(cliff, END_TIME - 1).toFixed()).toBe('0');
    expect(getVestedAmount(cliff, END_TIME).toFixed()).toBe('106560000000');
  });
});

describe('getVestingBreakdown', () => {
  const schedule = requireSchedule(VESTING_ACCOUNT);

  it('splits the balance into locked and available before vesting starts', () => {
    const breakdown = getVestingBreakdown(schedule, '110294549738ugnot', START_TIME - 1);

    expect(breakdown.total.toFixed()).toBe('110294549738');
    expect(breakdown.locked.toFixed()).toBe('106560000000');
    expect(breakdown.available.toFixed()).toBe('3734549738');
    expect(breakdown.progress).toBe(0);
  });

  it('locks nothing once the schedule has ended', () => {
    const breakdown = getVestingBreakdown(schedule, '110294549738ugnot', END_TIME);

    expect(breakdown.locked.toFixed()).toBe('0');
    expect(breakdown.available.toFixed()).toBe('110294549738');
    expect(breakdown.progress).toBe(1);
  });

  // Gas fees and storage deposits debit locked coins on chain, so the balance
  // can fall below the locked amount; available must not go negative.
  it('floors the available amount at zero when the balance is below the lock', () => {
    const breakdown = getVestingBreakdown(schedule, '1000ugnot', START_TIME);

    expect(breakdown.available.toFixed()).toBe('0');
  });
});
