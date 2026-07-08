import React from 'react';

import { Portal } from '@components/atoms';
import { SessionDetailCard } from '@components/molecules/session-detail-card';

import {
  PopoverWrapper,
  ScrollContainer,
  Title,
} from './session-overview-popover.styles';

interface SessionOverviewPopoverProps {
  open: boolean;
  positionY: number;
  caretRight: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  masterAddress: string;
  expiresAt: number;
  allowPaths: string[];
  spendLimitUgnot?: string;
  spendPeriod?: number;
  spendUsedUgnot?: string;
  spendReset?: number;
  onOpenAccount: (address: string) => void;
  onOpenRealm: (path: string) => void;
}

export const SessionOverviewPopover: React.FC<SessionOverviewPopoverProps> = ({
  open,
  positionY,
  caretRight,
  onMouseEnter,
  onMouseLeave,
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
  if (!open) return null;

  return (
    <Portal selector='portal-popup'>
      <PopoverWrapper
        $caretRight={caretRight}
        $positionY={positionY}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <ScrollContainer>
          <Title>Session Overview</Title>
          <SessionDetailCard
            showMasterRow
            masterAddress={masterAddress}
            expiresAt={expiresAt}
            allowPaths={allowPaths}
            spendLimitUgnot={spendLimitUgnot}
            spendPeriod={spendPeriod}
            spendUsedUgnot={spendUsedUgnot}
            spendReset={spendReset}
            onOpenAccount={onOpenAccount}
            onOpenRealm={onOpenRealm}
          />
        </ScrollContainer>
      </PopoverWrapper>
    </Portal>
  );
};

export default SessionOverviewPopover;
