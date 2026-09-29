import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';

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

const DATE_FORMAT = 'MMM D, YYYY';

const formatGnot = (amount: BigNumber): string =>
  `${amount.shiftedBy(GNOT_TOKEN.decimals * -1).toFormat()} ${GNOT_TOKEN.symbol}`;

const formatDate = (unixSeconds: number): string => dayjs(unixSeconds * 1000).format(DATE_FORMAT);

export interface TokenVestingPanelProps {
  open: boolean;
  vesting: VestingInfo;
  /**
   * Unix seconds of the chain's latest block, or null until one has been read.
   * Vesting is enforced at `ctx.BlockTime()`, so the split has to follow the
   * chain's clock — a device clock running ahead would report funds as
   * transferable before the chain agrees. Supplied by the screen so this stays
   * a presentational component.
   */
  blockTimeSec: number | null;
}

export const TokenVestingPanel: React.FC<TokenVestingPanelProps> = ({
  open,
  vesting,
  blockTimeSec,
}) => {
  const { schedule, coins } = vesting;

  const breakdown = useMemo(
    () => (blockTimeSec === null ? null : getVestingBreakdown(schedule, coins, blockTimeSec)),
    [schedule, coins, blockTimeSec],
  );

  const percent = useMemo(
    () => (breakdown === null ? 0 : Math.min(100, Math.max(0, breakdown.progress * 100))),
    [breakdown],
  );

  // Until the chain's clock has been read there is no honest figure to show,
  // so the amounts read "-" rather than falling back to the device clock.
  const formatAmount = (amount: BigNumber | undefined): string =>
    amount === undefined ? '-' : formatGnot(amount);

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
            <RowValue $tone='primary'>{formatAmount(breakdown?.available)}</RowValue>
          </Row>

          <Row $open={open} $index={1}>
            <RowLabel>
              <IconLockOutline />
              Locked · Vesting
            </RowLabel>
            <RowValue $tone='muted'>{formatAmount(breakdown?.locked)}</RowValue>
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
            <RowValue $tone='vested'>
              {breakdown === null ? '-' : `${percent.toFixed(1)}% Vested`}
            </RowValue>
          </Row>
        </PanelBody>
      </PanelClip>
    </PanelCollapse>
  );
};

export default TokenVestingPanel;
