import { act, render, RenderResult, screen, within } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { ABCIAccountVesting } from '@common/provider/gno';
import { parseVestingSchedule, VestingSchedule } from '@common/utils/vesting-utils';
import theme from '@styles/theme';

import { TokenVestingPanel } from './token-vesting-panel';

const START_TIME = 1789225200;
const END_TIME = 1852383600;

// Every fixture here is a valid grant, so a null schedule is a test failure.
const requireSchedule = (vesting: ABCIAccountVesting): VestingSchedule => {
  const schedule = parseVestingSchedule(vesting);
  if (!schedule) {
    throw new Error(`expected a vesting schedule for ${JSON.stringify(vesting)}`);
  }
  return schedule;
};

const CONTINUOUS_SCHEDULE = requireSchedule({
  original_vesting: '106560000000ugnot',
  start_time: `${START_TIME}`,
  end_time: `${END_TIME}`,
});

// Spendable and Locked both end in "GNOT"; reach the one under test through
// its own row rather than by matching the unit.
const readSpendable = (): string | null =>
  within(screen.getByText('Spendable').parentElement as HTMLElement).getAllByText(/GNOT$/)[0]
    .textContent;

const renderPanel = (
  overrides: Partial<React.ComponentProps<typeof TokenVestingPanel>> = {},
): RenderResult => {
  const props: React.ComponentProps<typeof TokenVestingPanel> = {
    open: true,
    vesting: { schedule: CONTINUOUS_SCHEDULE, coins: '110294549738ugnot' },
    ...overrides,
  };

  return render(
    <ThemeProvider theme={theme}>
      <TokenVestingPanel {...props} />
    </ThemeProvider>,
  );
};

describe('TokenVestingPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('splits the balance into spendable and locked before vesting starts', () => {
    jest.setSystemTime((START_TIME - 1) * 1000);

    renderPanel();

    expect(screen.getByText('3,734.549738 GNOT')).not.toBeNull();
    expect(screen.getByText('106,560 GNOT')).not.toBeNull();
  });

  it('locks nothing once the schedule has ended', () => {
    jest.setSystemTime(END_TIME * 1000);

    renderPanel();

    expect(screen.getByText('110,294.549738 GNOT')).not.toBeNull();
    expect(screen.getByText('0 GNOT')).not.toBeNull();
  });

  // The whole point of the 1s clock: the figure has to move without the account
  // query returning anything new.
  it('recomputes spendable every second while open', () => {
    const oneDayIn = START_TIME + 86_400;
    jest.setSystemTime(oneDayIn * 1000);

    renderPanel();

    const before = readSpendable();

    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(readSpendable()).not.toEqual(before);
  });

  it('does not run the clock while collapsed', () => {
    jest.setSystemTime((START_TIME + 86_400) * 1000);

    renderPanel({ open: false });

    const before = readSpendable();

    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    expect(readSpendable()).toEqual(before);
  });

  it('shows a single unlock date for a cliff schedule', () => {
    jest.setSystemTime(START_TIME * 1000);

    renderPanel({
      vesting: {
        schedule: requireSchedule({
          original_vesting: '106560000000ugnot',
          end_time: `${END_TIME}`,
          type: 'delayed',
        }),
        coins: '110294549738ugnot',
      },
    });

    expect(screen.getByText('Unlocks On')).not.toBeNull();
    expect(screen.queryByText('Vesting Period')).toBeNull();
  });
});
