import {AppState} from 'react-native';

import {
  AutoLock,
  effectiveAutoLockMinutes,
  MAX_AUTO_LOCK_MINUTES,
} from '../../src/platform/auto-lock';

let appStateHandler: ((state: string) => Promise<void>) | null = null;

beforeEach(() => {
  jest.useFakeTimers();
  appStateHandler = null;
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, handler: any) => {
      appStateHandler = handler;
      return {remove: jest.fn()} as any;
    });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const setup = (minutes: number) => {
  let clock = 1_000_000;
  const lock = jest.fn(async () => undefined);
  const autoLock = new AutoLock({
    readMinutes: async () => minutes,
    isUnlocked: async () => true,
    lock,
    now: () => clock,
  });
  autoLock.start();
  return {
    lock,
    autoLock,
    advanceClock: (ms: number) => {
      clock += ms;
    },
  };
};

describe('effectiveAutoLockMinutes', () => {
  it('never disables auto-lock and caps long settings', () => {
    expect(effectiveAutoLockMinutes(0)).toBe(MAX_AUTO_LOCK_MINUTES);
    expect(effectiveAutoLockMinutes(NaN)).toBe(MAX_AUTO_LOCK_MINUTES);
    expect(effectiveAutoLockMinutes(1440)).toBe(MAX_AUTO_LOCK_MINUTES);
    expect(effectiveAutoLockMinutes(5)).toBe(5);
  });
});

describe('AutoLock', () => {
  it('locks after the idle time in the foreground', async () => {
    const {lock, autoLock} = setup(5);
    await autoLock.reset();

    jest.advanceTimersByTime(5 * 60_000 - 1);
    expect(lock).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(lock).toHaveBeenCalledTimes(1);
  });

  it('locks on return when the app stayed in the background too long', async () => {
    const {lock, advanceClock} = setup(5);

    await appStateHandler!('background');
    advanceClock(5 * 60_000);
    await appStateHandler!('active');

    expect(lock).toHaveBeenCalledTimes(1);
  });

  it('stays unlocked after a short trip to the background', async () => {
    const {lock, advanceClock} = setup(5);

    await appStateHandler!('background');
    advanceClock(60_000);
    await appStateHandler!('active');

    expect(lock).not.toHaveBeenCalled();
  });

  it('locks when the device clock moved backwards while in the background', async () => {
    const {lock, advanceClock} = setup(5);

    await appStateHandler!('background');
    advanceClock(-60_000);
    await appStateHandler!('active');

    expect(lock).toHaveBeenCalledTimes(1);
  });
});
