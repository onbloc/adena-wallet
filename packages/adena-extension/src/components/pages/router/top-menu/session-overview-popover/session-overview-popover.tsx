import React from 'react';

import IconCircleExclamation from '@assets/icon-circle-exclamation';
import { Portal } from '@components/atoms';
import { SessionDetailCard } from '@components/molecules/session-detail-card';

import {
  PopoverWrapper,
  RevokedChip,
  RevokedContainer,
  RevokedDescription,
  RevokedInlineButton,
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
  revoked?: boolean;
  onRemoveAccount?: () => void;
  onExportKey?: () => void;
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
  revoked = false,
  onRemoveAccount,
  onExportKey,
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
        {revoked ? (
          // A revoked session can no longer sign, so its allowed paths and spend
          // limit no longer mean anything. The popover becomes the recovery
          // instructions instead of an overview.
          <RevokedContainer>
            <RevokedChip>
              <IconCircleExclamation />
              REVOKED
            </RevokedChip>
            <div>
              <RevokedDescription>
                This session account has been revoked and is no longer usable. Please{' '}
                <RevokedInlineButton type='button' onClick={onRemoveAccount}>
                  remove this account
                </RevokedInlineButton>{' '}
                from your wallet.
              </RevokedDescription>
              <RevokedDescription>
                If you have any balance in your session account,{' '}
                <RevokedInlineButton type='button' onClick={onExportKey}>
                  export your key
                </RevokedInlineButton>{' '}
                first.
              </RevokedDescription>
            </div>
          </RevokedContainer>
        ) : (
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
        )}
      </PopoverWrapper>
    </Portal>
  );
};

export default SessionOverviewPopover;
