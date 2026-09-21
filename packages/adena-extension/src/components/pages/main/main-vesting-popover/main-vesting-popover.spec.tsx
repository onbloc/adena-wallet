import { render, RenderResult, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { ABCIAccountVesting } from '@common/provider/gno';
import { parseVestingSchedule, VestingSchedule } from '@common/utils/vesting-utils';
import theme from '@styles/theme';

import { MainVestingPopover } from './main-vesting-popover';

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

const renderPopover = (
  overrides: Partial<React.ComponentProps<typeof MainVestingPopover>> = {},
): RenderResult => {
  const props: React.ComponentProps<typeof MainVestingPopover> = {
    open: true,
    positionX: 140,
    positionY: 120,
    schedule: CONTINUOUS_SCHEDULE,
    coins: '110294549738ugnot',
    onMouseEnter: jest.fn(),
    onMouseLeave: jest.fn(),
    ...overrides,
  };

  return render(
    <ThemeProvider theme={theme}>
      <div id='portal-popup' />
      <MainVestingPopover {...props} />
    </ThemeProvider>,
  );
};

describe('MainVestingPopover', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing while closed', () => {
    renderPopover({ open: false });

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('breaks the balance down into locked and available before vesting starts', () => {
    jest.setSystemTime((START_TIME - 1) * 1000);

    renderPopover();

    expect(screen.getByText('110,294.549738 GNOT')).toBeTruthy();
    expect(screen.getByText('106,560 GNOT')).toBeTruthy();
    expect(screen.getByText('3,734.549738 GNOT')).toBeTruthy();
    expect(screen.getByText('0% vested')).toBeTruthy();
  });

  it('locks nothing once the schedule has ended', () => {
    jest.setSystemTime(END_TIME * 1000);

    renderPopover();

    expect(screen.getByText('0 GNOT')).toBeTruthy();
    expect(screen.getByText('100% vested')).toBeTruthy();
  });

  it('shows the vesting period for a continuous schedule', () => {
    jest.setSystemTime(START_TIME * 1000);

    renderPopover();

    expect(screen.getByText('Vesting Period')).toBeTruthy();
  });

  it('shows a single unlock date for a cliff schedule', () => {
    jest.setSystemTime(START_TIME * 1000);

    renderPopover({
      schedule: requireSchedule({
        original_vesting: '106560000000ugnot',
        end_time: `${END_TIME}`,
        type: 'delayed',
      }),
    });

    expect(screen.getByText('Unlocks On')).toBeTruthy();
    expect(screen.queryByText('Vesting Period')).toBeNull();
  });
});
