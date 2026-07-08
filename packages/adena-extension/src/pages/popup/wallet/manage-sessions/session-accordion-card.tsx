import React from 'react';

import { SessionDetailCard } from '@components/molecules/session-detail-card';
import IconChevronDown from '@assets/icon-chevron-down';
import IconShare from '@assets/icon-share';
import { formatAddress } from '@common/utils/client-utils';

import {
  Card,
  ExpandedSection,
  Header,
  RevokeRow,
} from './session-accordion-card.styles';

interface SessionAccordionCardProps {
  sessionName: string;
  sessionAddr: string;
  masterAddress: string;
  expiresAt: number;
  allowPaths: string[];
  spendLimitUgnot?: string;
  spendPeriod?: number;
  spendUsedUgnot?: string;
  spendReset?: number;
  expanded: boolean;
  onToggle: () => void;
  onOpenSession: (address: string) => void;
  onOpenRealm: (path: string) => void;
  onRevoke: () => void;
}

const IconUnlink = (): JSX.Element => (
  <svg width='17' height='17' viewBox='0 0 17 17' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path
      d='M13.5096 3.49145C12.1878 2.16952 10.0489 2.16952 8.7286 3.49145L7.21461 5.00559L8.01145 5.8025L9.52544 4.28837C10.366 3.4477 11.7847 3.35864 12.7128 4.28837C13.6424 5.2181 13.5534 6.63536 12.7128 7.47602L11.1988 8.99016L11.9972 9.78864L13.5112 8.2745C14.8299 6.95256 14.8299 4.81339 13.5096 3.49145ZM7.4771 12.7138C6.63652 13.5544 5.21784 13.6435 4.28976 12.7138C3.36011 11.784 3.44917 10.3668 4.28976 9.52612L5.80375 8.01199L5.00535 7.21351L3.49136 8.72765C2.16955 10.0496 2.16955 12.1888 3.49136 13.5091C4.81317 14.8295 6.95213 14.8311 8.27237 13.5091L9.78636 11.995L8.98953 11.1981L7.4771 12.7138ZM4.56787 3.77272C4.54438 3.74945 4.51265 3.7364 4.47959 3.7364C4.44653 3.7364 4.41481 3.74945 4.39131 3.77272L3.77259 4.3915C3.74933 4.41499 3.73628 4.44672 3.73628 4.47978C3.73628 4.51285 3.74933 4.54457 3.77259 4.56807L12.4347 13.231C12.4831 13.2794 12.5628 13.2794 12.6112 13.231L13.2299 12.6122C13.2784 12.5638 13.2784 12.4841 13.2299 12.4356L4.56787 3.77272Z'
      fill='currentColor'
    />
  </svg>
);

export const SessionAccordionCard: React.FC<SessionAccordionCardProps> = ({
  sessionName,
  sessionAddr,
  masterAddress,
  expiresAt,
  allowPaths,
  spendLimitUgnot,
  spendPeriod,
  spendUsedUgnot,
  spendReset,
  expanded,
  onToggle,
  onOpenSession,
  onOpenRealm,
  onRevoke,
}) => {
  const handleHeaderKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <Card>
      <Header
        $expanded={expanded}
        onClick={onToggle}
        onKeyDown={handleHeaderKeyDown}
        role='button'
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`Toggle ${sessionName}`}
      >
        <div className='left'>
          <span className='session-name'>{sessionName}</span>
          <div className='address-row'>
            <span className='address'>{formatAddress(sessionAddr, 6)}</span>
            <button
              type='button'
              className='address-share'
              aria-label={`Open ${sessionName} on gnoscan`}
              onClick={(e): void => {
                e.stopPropagation();
                onOpenSession(sessionAddr);
              }}
            >
              <IconShare />
            </button>
          </div>
        </div>
        <span className='chevron' aria-hidden='true'>
          <IconChevronDown />
        </span>
      </Header>
      {expanded && (
        <ExpandedSection>
          <SessionDetailCard
            showMasterRow
            masterAddress={masterAddress}
            expiresAt={expiresAt}
            allowPaths={allowPaths}
            spendLimitUgnot={spendLimitUgnot}
            spendPeriod={spendPeriod}
            spendUsedUgnot={spendUsedUgnot}
            spendReset={spendReset}
            onOpenAccount={onOpenSession}
            onOpenRealm={onOpenRealm}
          />
          <RevokeRow type='button' onClick={onRevoke} aria-label='Revoke this session'>
            <IconUnlink />
            Revoke This Session
          </RevokeRow>
        </ExpandedSection>
      )}
    </Card>
  );
};

export default SessionAccordionCard;
