import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';

import IconLockOutline from '@assets/icon-lock-outline';
import { GNOT_TOKEN } from '@common/constants/token.constant';
import { getVestingBreakdown, VestingInfo } from '@common/utils/vesting-utils';

import {
  PanelBody,
  PanelClip,
  PanelCollapse,
  ProgressFill,
  ProgressRow,
  ProgressTrack,
  Row,
  RowLabel,
  RowValue,
  StatusDot,
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
    () => Math.min(100, Math.max(0, breakdown.progress * 100)),
    [breakdown.progress],
  );

  // The design's "Auto-release every block" describes the default linear curve,
  // which vests on every block's timestamp. A cliff releases nothing until its
  // end time, so it gets that date instead of a claim that would be false.
  const releaseLabel =
    schedule.type === 'delayed'
      ? `Unlocks on ${formatDate(schedule.endTime)}`
      : 'Auto-release every block';

  return (
    <PanelCollapse $open={open} aria-hidden={!open}>
      <PanelClip>
        <PanelBody>
          <Row $open={open} $index={0}>
            <RowLabel>Spendable</RowLabel>
            <RowValue $tone='primary'>{formatGnot(breakdown.available)}</RowValue>
          </Row>

          <Row $open={open} $index={1}>
            <RowLabel>
              <IconLockOutline />
              Locked · Vesting
            </RowLabel>
            <RowValue $tone='muted'>{formatGnot(breakdown.locked)}</RowValue>
          </Row>

          <ProgressRow $open={open} $index={2}>
            <ProgressTrack>
              <ProgressFill $open={open} $percent={percent} />
            </ProgressTrack>
          </ProgressRow>

          <Row $open={open} $index={3}>
            <RowLabel>
              <StatusDot />
              {releaseLabel}
            </RowLabel>
            <RowValue $tone='vested'>{`${percent.toFixed(1)}% Vested`}</RowValue>
          </Row>
        </PanelBody>
      </PanelClip>
    </PanelCollapse>
  );
};

export default TokenVestingPanel;
