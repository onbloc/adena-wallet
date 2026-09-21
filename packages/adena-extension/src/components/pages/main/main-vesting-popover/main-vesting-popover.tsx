import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import { getVestingBreakdown, VestingSchedule } from '@common/utils/vesting-utils';
import { Portal } from '@components/atoms';

import {
  Divider,
  Header,
  PeriodLabel,
  PeriodValue,
  PopoverWrapper,
  ProgressFill,
  ProgressLabel,
  ProgressTrack,
  Row,
  RowLabel,
  RowList,
  RowValue,
  Title,
} from './main-vesting-popover.styles';

// The locked amount moves continuously, so the figures are recomputed on a
// clock rather than only when the account query returns. The timer only runs
// while the popover is open — the main screen must not re-render every second.
const TICK_INTERVAL = 1_000;

const DATE_FORMAT = 'MMM D, YYYY HH:mm';

const formatGnot = (amount: BigNumber): string =>
  `${amount.shiftedBy(GNOT_TOKEN.decimals * -1).toFormat()} ${GNOT_TOKEN.symbol}`;

const formatDate = (unixSeconds: number): string => dayjs(unixSeconds * 1000).format(DATE_FORMAT);

export interface MainVestingPopoverProps {
  open: boolean;
  /** Caret offset in px, measured from the popover's own left edge. */
  positionX: number;
  positionY: number;
  schedule: VestingSchedule;
  /** Raw amino coin string for the account, e.g. "110294549738ugnot". */
  coins: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const MainVestingPopover: React.FC<MainVestingPopoverProps> = ({
  open,
  positionX,
  positionY,
  schedule,
  coins,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!open) {
      return;
    }
    setNowSec(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), TICK_INTERVAL);
    return (): void => clearInterval(id);
  }, [open]);

  const breakdown = useMemo(
    () => getVestingBreakdown(schedule, coins, nowSec),
    [schedule, coins, nowSec],
  );

  const percent = useMemo(() => Math.round(breakdown.progress * 1000) / 10, [breakdown.progress]);

  // A cliff has no start time to render, so it reads as a single unlock date.
  const periodLabel = schedule.type === 'delayed' ? 'Unlocks On' : 'Vesting Period';
  const periodValue =
    schedule.type === 'delayed'
      ? formatDate(schedule.endTime)
      : `${formatDate(schedule.startTime)} ~ ${formatDate(schedule.endTime)}`;

  if (!open) {
    return null;
  }

  return (
    <Portal selector='portal-popup'>
      <PopoverWrapper
        $caretX={positionX}
        $positionY={positionY}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        role='tooltip'
        aria-label='Vesting details'
      >
        <Header>
          <Title>Vesting</Title>
          <ProgressLabel>{`${percent}% vested`}</ProgressLabel>
        </Header>

        <ProgressTrack>
          <ProgressFill $percent={Math.min(100, Math.max(0, percent))} />
        </ProgressTrack>

        <RowList>
          <Row>
            <RowLabel>Total Balance</RowLabel>
            <RowValue $emphasized>{formatGnot(breakdown.total)}</RowValue>
          </Row>
          <Row>
            <RowLabel>Locked</RowLabel>
            <RowValue>{formatGnot(breakdown.locked)}</RowValue>
          </Row>
          <Row>
            {/* Locked coins can still leave as gas fees and storage deposits,
                so this is what can be transferred, not what is reserved. */}
            <RowLabel>Available</RowLabel>
            <RowValue>{formatGnot(breakdown.available)}</RowValue>
          </Row>
        </RowList>

        <Divider />

        <PeriodLabel>{periodLabel}</PeriodLabel>
        <PeriodValue>{periodValue}</PeriodValue>
      </PopoverWrapper>
    </Portal>
  );
};

export default MainVestingPopover;
