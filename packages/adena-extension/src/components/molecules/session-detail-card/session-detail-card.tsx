import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';

import IconCircleExclamation from '@assets/icon-circle-exclamation';
import IconClock from '@assets/icon-clock';
import IconShare from '@assets/icon-share';
import { formatAddress } from '@common/utils/client-utils';

import {
  CardContainer,
  Chip,
  LinkButton,
  RealmList,
  RealmRow,
  Row,
  RowBody,
  RowHeader,
  RowLabel,
  RowMuted,
  RowValue,
} from './session-detail-card.styles';

// Match the wallet's main asset list logo (loaded from the canonical
// gno-token-resource CDN) so the card stays visually consistent with the
// rest of the wallet wherever it appears.
const GNOT_LOGO_URL =
  'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/ugnot.svg';

const SECONDS_PER_DAY = 86_400;

const stripUgnotSuffix = (raw: string): string => raw.replace(/u?gnot$/i, '').trim();

const ugnotToGnotDisplay = (raw: string): string => {
  if (!raw) return '0';
  const numeric = stripUgnotSuffix(raw);
  const bn = new BigNumber(numeric);
  if (!bn.isFinite()) return '0';
  return bn.dividedBy(1_000_000).toFormat();
};

const formatCountdown = (secondsLeft: number): string => {
  if (secondsLeft <= 0) return '00:00:00';
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const formatDuration = (seconds: number): string => {
  const units = [
    { label: 'day', seconds: SECONDS_PER_DAY },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const unit of units) {
    if (seconds >= unit.seconds && seconds % unit.seconds === 0) {
      const value = seconds / unit.seconds;
      return `${value} ${unit.label}${value === 1 ? '' : 's'}`;
    }
  }

  return `${seconds} second${seconds === 1 ? '' : 's'}`;
};

const VM_EXEC_ALLOW_PATH_PREFIX = 'vm/exec:';

const getRealmPathFromAllowPath = (allowPath: string): string | null => {
  if (!allowPath.startsWith(VM_EXEC_ALLOW_PATH_PREFIX)) {
    return null;
  }

  const realmPath = allowPath.slice(VM_EXEC_ALLOW_PATH_PREFIX.length);
  if (!realmPath.startsWith('gno.land/')) {
    return null;
  }

  return realmPath;
};

const formatAllowPathDisplay = (allowPath: string): string => {
  if (allowPath === '*') {
    return 'No restrictions';
  }

  if (allowPath.startsWith(VM_EXEC_ALLOW_PATH_PREFIX)) {
    return allowPath.slice(VM_EXEC_ALLOW_PATH_PREFIX.length);
  }

  return allowPath;
};

type ExpiryChipState =
  | { kind: 'hidden' }
  | { kind: 'days'; label: string }
  | { kind: 'sub-day' }
  | { kind: 'expired' };

const resolveExpiryChip = (expiresAt: number, nowSec: number): ExpiryChipState => {
  if (!expiresAt || expiresAt <= 0) return { kind: 'hidden' };
  const secLeft = expiresAt - nowSec;
  if (secLeft <= 0) return { kind: 'expired' };
  if (secLeft < SECONDS_PER_DAY) return { kind: 'sub-day' };
  return { kind: 'days', label: `${Math.floor(secLeft / SECONDS_PER_DAY)}d` };
};

const formatExpiresAtDate = (expiresAt: number): string => {
  if (!expiresAt || expiresAt <= 0) return 'Does not expire';
  return dayjs(expiresAt * 1000).format('MMM D, YYYY  HH:mm:ss');
};

export interface SessionDetailCardProps {
  showMasterRow?: boolean;
  hideRowBorders?: boolean;
  masterAddress: string;
  expiresAt: number;
  allowPaths: string[];
  spendLimitUgnot?: string;
  spendPeriod?: number;
  spendUsedUgnot?: string;
  spendReset?: number;
  onOpenAccount?: (address: string) => void;
  onOpenRealm?: (path: string) => void;
}

export const SessionDetailCard: React.FC<SessionDetailCardProps> = ({
  showMasterRow = false,
  hideRowBorders = false,
  masterAddress,
  expiresAt,
  allowPaths,
  spendLimitUgnot,
  spendPeriod,
  spendUsedUgnot,
  spendReset,
  onOpenAccount,
  onOpenRealm,
}) => {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return (): void => clearInterval(id);
  }, []);

  const expiryChip = useMemo(() => resolveExpiryChip(expiresAt, nowSec), [expiresAt, nowSec]);
  const expiresAtDate = useMemo(() => formatExpiresAtDate(expiresAt), [expiresAt]);

  const spendLimitBn = useMemo(
    () => (spendLimitUgnot ? new BigNumber(stripUgnotSuffix(spendLimitUgnot)) : new BigNumber(0)),
    [spendLimitUgnot],
  );
  const spendUsedBn = useMemo(
    () => (spendUsedUgnot ? new BigNumber(stripUgnotSuffix(spendUsedUgnot)) : new BigNumber(0)),
    [spendUsedUgnot],
  );
  const showSpendLimit = spendLimitBn.gt(0);
  const percentUsed = useMemo(() => {
    if (!showSpendLimit) return 0;
    const pct = spendUsedBn.dividedBy(spendLimitBn).multipliedBy(100);
    return Math.min(100, Math.max(0, Math.round(pct.toNumber())));
  }, [spendLimitBn, spendUsedBn, showSpendLimit]);
  const spendLimitDisplay = useMemo(
    () => (showSpendLimit ? ugnotToGnotDisplay(spendLimitUgnot ?? '0') : ''),
    [showSpendLimit, spendLimitUgnot],
  );

  const spendPeriodLeft = useMemo(() => {
    if (!spendPeriod || spendPeriod <= 0) return null;
    if (!spendReset || spendReset <= 0) return null;
    return Math.max(0, spendReset + spendPeriod - nowSec);
  }, [spendPeriod, spendReset, nowSec]);
  const spendPeriodLabel = useMemo(() => {
    if (!spendPeriod || spendPeriod <= 0) return 'No reset scheduled';
    if (spendPeriodLeft === null || spendPeriodLeft <= 0) {
      return `Every ${formatDuration(spendPeriod)}`;
    }
    return `Next reset in ${formatCountdown(spendPeriodLeft)}`;
  }, [spendPeriod, spendPeriodLeft]);
  const rowProps = { $hideBorder: hideRowBorders };

  return (
    <CardContainer>
      {showMasterRow && (
        <Row {...rowProps}>
          <RowHeader>
            <RowLabel>Master Account</RowLabel>
          </RowHeader>
          <RowBody>
            <RowValue $fontSize={14}>{formatAddress(masterAddress, 6)}</RowValue>
            {onOpenAccount && (
              <LinkButton
                type='button'
                aria-label='Open master account on gnoscan'
                onClick={(): void => onOpenAccount(masterAddress)}
              >
                <IconShare />
              </LinkButton>
            )}
          </RowBody>
        </Row>
      )}

      <Row {...rowProps}>
        <RowHeader>
          <RowLabel>Expires At</RowLabel>
          {expiryChip.kind === 'expired' && (
            <Chip $variant='danger'>
              <IconCircleExclamation />
              EXPIRED
            </Chip>
          )}
          {expiryChip.kind === 'sub-day' && (
            <Chip $variant='info'>
              <IconClock />
              {'<1d'}
            </Chip>
          )}
          {expiryChip.kind === 'days' && (
            <Chip $variant='info'>
              <IconClock />
              {expiryChip.label}
            </Chip>
          )}
        </RowHeader>
        <RowBody>
          <RowValue>{expiresAtDate}</RowValue>
        </RowBody>
      </Row>

      {showSpendLimit && (
        <Row {...rowProps}>
          <RowHeader>
            <RowLabel>Spend Limit</RowLabel>
            <Chip $variant={percentUsed >= 100 ? 'danger' : 'info'}>{percentUsed}% USED</Chip>
          </RowHeader>
          <RowBody>
            <img className='crypto-icon' src={GNOT_LOGO_URL} alt='GNOT' />
            <RowValue>{spendLimitDisplay} GNOT</RowValue>
          </RowBody>
        </Row>
      )}

      {showSpendLimit && (
        <Row {...rowProps}>
          <RowHeader>
            <RowLabel>Spend Period</RowLabel>
          </RowHeader>
          <RowBody>
            <RowValue>{spendPeriodLabel}</RowValue>
          </RowBody>
        </Row>
      )}

      <Row {...rowProps}>
        <RowHeader>
          <RowLabel>Allow Paths</RowLabel>
        </RowHeader>
        {allowPaths.length === 0 ? (
          <RowBody>
            <RowMuted>No allow paths</RowMuted>
          </RowBody>
        ) : (
          <RealmList>
            {allowPaths.map((allowPath) => {
              const realmPath = getRealmPathFromAllowPath(allowPath);
              const allowPathDisplay = formatAllowPathDisplay(allowPath);
              return (
                <RealmRow key={allowPath}>
                  <RowValue>{allowPathDisplay}</RowValue>
                  {realmPath && onOpenRealm && (
                    <LinkButton
                      type='button'
                      aria-label={`Open ${realmPath} on gnoscan`}
                      onClick={(): void => onOpenRealm(realmPath)}
                    >
                      <IconShare />
                    </LinkButton>
                  )}
                </RealmRow>
              );
            })}
          </RealmList>
        )}
      </Row>
    </CardContainer>
  );
};

export default SessionDetailCard;
