import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import { getVestingBreakdown, VestingInfo } from '@common/utils/vesting-utils';

import {
  PanelBody,
  PanelClip,
  PanelCollapse,
  ProgressFill,
  ProgressTrack,
  Row,
  RowLabel,
  RowValue,
} from './token-vesting-panel.styles';

// Spendable moves continuously — for a two-year grant the sixth decimal turns
// over roughly every 0.6s — so the figures are recomputed on a 1s clock. The
// timer only runs while the panel is open.
const TICK_INTERVAL = 1_000;

const DATE_FORMAT = 'MMM D, YYYY';

const formatGnot = (amount: BigNumber): string =>
  `${amount.shiftedBy(GNOT_TOKEN.decimals * -1).toFormat()} ${GNOT_TOKEN.symbol}`;

const formatDate = (unixSeconds: number): string => dayjs(unixSeconds * 1000).format(DATE_FORMAT);

export interface TokenVestingPanelProps {
  open: boolean;
  vesting: VestingInfo;
}

export const TokenVestingPanel: React.FC<TokenVestingPanelProps> = ({ open, vesting }) => {
  const { schedule, coins } = vesting;
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

  const percent = useMemo(
    () => Math.min(100, Math.max(0, Math.round(breakdown.progress * 1000) / 10)),
    [breakdown.progress],
  );

  // A cliff has no start to render, so it reads as a single unlock date.
  const periodLabel = schedule.type === 'delayed' ? 'Unlocks On' : 'Vesting Period';
  const periodValue =
    schedule.type === 'delayed'
      ? formatDate(schedule.endTime)
      : `${formatDate(schedule.startTime)} ~ ${formatDate(schedule.endTime)}`;

  return (
    <PanelCollapse $open={open} aria-hidden={!open}>
      <PanelClip>
        <PanelBody>
          <ProgressTrack $open={open}>
            <ProgressFill $open={open} $percent={percent} />
          </ProgressTrack>

          <Row $open={open} $index={0}>
            <RowLabel>Spendable</RowLabel>
            <RowValue $emphasized>{formatGnot(breakdown.available)}</RowValue>
          </Row>
          <Row $open={open} $index={1}>
            <RowLabel>Locked</RowLabel>
            <RowValue>{formatGnot(breakdown.locked)}</RowValue>
          </Row>
          <Row $open={open} $index={2}>
            <RowLabel>{periodLabel}</RowLabel>
            <RowValue>{periodValue}</RowValue>
          </Row>
        </PanelBody>
      </PanelClip>
    </PanelCollapse>
  );
};

export default TokenVestingPanel;
