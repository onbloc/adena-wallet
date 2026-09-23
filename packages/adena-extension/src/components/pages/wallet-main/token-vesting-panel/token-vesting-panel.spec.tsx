import { render, RenderResult, screen, within } from '@testing-library/react';
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

const CLIFF_SCHEDULE = requireSchedule({
  original_vesting: '106560000000ugnot',
  end_time: `${END_TIME}`,
  type: 'delayed',
});

const COINS = '110294549738ugnot';

// Spendable and Locked both end in "GNOT"; reach the one under test through
// its own row rather than by matching the unit.
const readRow = (label: string): string | null =>
  within(screen.getByText(label).parentElement as HTMLElement).getAllByText(/GNOT$|^-$/)[0]
    .textContent;

const renderPanel = (
  overrides: Partial<React.ComponentProps<typeof TokenVestingPanel>> = {},
): RenderResult => {
  const props: React.ComponentProps<typeof TokenVestingPanel> = {
    open: true,
    vesting: { schedule: CONTINUOUS_SCHEDULE, coins: COINS },
    blockTimeSec: START_TIME,
    ...overrides,
  };

  return render(
    <ThemeProvider theme={theme}>
      <TokenVestingPanel {...props} />
    </ThemeProvider>,
  );
};

describe('TokenVestingPanel', () => {
  it('splits the balance into spendable and locked before vesting starts', () => {
    renderPanel({ blockTimeSec: START_TIME - 1 });

    expect(screen.getByText('3,734.549738 GNOT')).not.toBeNull();
    expect(screen.getByText('106,560 GNOT')).not.toBeNull();
    expect(screen.getByText('Locked · Vesting')).not.toBeNull();
    expect(screen.getByText('0.0% Vested')).not.toBeNull();
  });

  it('locks nothing once the schedule has ended', () => {
    renderPanel({ blockTimeSec: END_TIME });

    expect(screen.getByText('110,294.549738 GNOT')).not.toBeNull();
    expect(screen.getByText('0 GNOT')).not.toBeNull();
    expect(screen.getByText('100.0% Vested')).not.toBeNull();
    expect(screen.getByText('Auto-release every block')).not.toBeNull();
  });

  it('tracks block time as it advances', () => {
    const { rerender } = renderPanel({ blockTimeSec: START_TIME + 86_400 });
    const before = readRow('Spendable');

    rerender(
      <ThemeProvider theme={theme}>
        <TokenVestingPanel
          open
          vesting={{ schedule: CONTINUOUS_SCHEDULE, coins: COINS }}
          blockTimeSec={START_TIME + 86_401}
        />
      </ThemeProvider>,
    );

    expect(readRow('Spendable')).not.toEqual(before);
  });

  // The device clock must not release funds the chain still holds: a cliff
  // ending at END_TIME stays fully locked while block time reads END_TIME - 1,
  // however far ahead the local clock happens to be.
  it('keeps a cliff locked while block time is still short of its end', () => {
    jest.useFakeTimers();
    jest.setSystemTime((END_TIME + 3_600) * 1000);

    renderPanel({
      vesting: { schedule: CLIFF_SCHEDULE, coins: COINS },
      blockTimeSec: END_TIME - 1,
    });

    expect(readRow('Spendable')).toEqual('3,734.549738 GNOT');
    expect(readRow('Locked · Vesting')).toEqual('106,560 GNOT');
    expect(screen.getByText('0.0% Vested')).not.toBeNull();

    jest.useRealTimers();
  });

  it('shows no figures until the chain clock has been read', () => {
    renderPanel({ blockTimeSec: null });

    expect(readRow('Spendable')).toEqual('-');
    expect(readRow('Locked · Vesting')).toEqual('-');
  });

  it('shows a single unlock date for a cliff schedule', () => {
    renderPanel({ vesting: { schedule: CLIFF_SCHEDULE, coins: COINS } });

    expect(screen.getByText(/^Unlocks on /)).not.toBeNull();
    expect(screen.queryByText('Auto-release every block')).toBeNull();
  });
});
