import React, { ReactElement, useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';
import { useMasterSessions } from '@hooks/wallet/use-master-sessions';
import { BottomFixedButtonGroup } from '@components/molecules/bottom-fixed-button-group';
import { RoutePath } from '@types';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

import { SessionAccordionCard } from './session-accordion-card';

const Container = styled.div`
  ${mixins.flex({ direction: 'column', align: 'stretch', justify: 'flex-start' })};
  width: 100%;
  padding: 24px 20px 120px;
  gap: 12px;
`;

const Status = styled.div`
  ${fonts.body3Reg};
  padding: 32px 12px;
  text-align: center;
  color: ${getTheme('neutral', 'a')};
`;

const ManageSessions = (): ReactElement => {
  const { params, navigate, goBack } = useAppNavigate<RoutePath.ManageSessions>();
  const { openScannerLink } = useLink();
  const [expandedAddr, setExpandedAddr] = useState<string | null>(null);

  // Fallback to the current account when no master is provided via state
  // (e.g. user navigates here from an external route without context).
  const masterFromState = params?.masterAddress;
  const masterAddress = useMemo(() => {
    if (masterFromState) return masterFromState;
    return undefined;
  }, [masterFromState]);

  const { entries, isLoading, error } = useMasterSessions(masterAddress);

  const revokeableEntries = useMemo(
    () => entries.filter((e) => e.status === 'ACTIVE'),
    [entries],
  );

  const handleToggle = useCallback((addr: string) => {
    setExpandedAddr((prev) => (prev === addr ? null : addr));
  }, []);

  const handleOpenAccount = useCallback(
    (address: string) => openScannerLink(`/account/${address}`),
    [openScannerLink],
  );
  const handleOpenRealm = useCallback(
    (path: string) => openScannerLink('/realms/details', { path }),
    [openScannerLink],
  );

  const handleRevokeOne = useCallback(
    (sessionAddr: string) => {
      if (!masterAddress) return;
      navigate(RoutePath.RevokeSession, { state: { sessionAddr, masterAddress } });
    },
    [navigate, masterAddress],
  );

  const handleRevokeAll = useCallback(() => {
    if (!masterAddress) return;
    navigate(RoutePath.RevokeAllSessions, { state: { masterAddress } });
  }, [navigate, masterAddress]);

  return (
    <Container>
      {!masterAddress && (
        <Status>Open this page from the master account&apos;s details.</Status>
      )}
      {masterAddress && isLoading && entries.length === 0 && (
        <Status>Loading sessions…</Status>
      )}
      {masterAddress && !isLoading && error && (
        <Status>Failed to load sessions: {error}</Status>
      )}
      {masterAddress && !isLoading && !error && entries.length === 0 && (
        <Status>No sessions.</Status>
      )}

      {entries.map((entry) => (
        <SessionAccordionCard
          key={entry.sessionAddr}
          sessionName={entry.name}
          sessionAddr={entry.sessionAddr}
          masterAddress={entry.masterAddress}
          expiresAt={entry.expiresAt}
          allowPaths={entry.allowPaths}
          spendLimitUgnot={entry.spendLimit || undefined}
          spendPeriod={entry.spendPeriod || undefined}
          spendUsedUgnot={entry.spendUsed || undefined}
          spendReset={entry.spendReset || undefined}
          expanded={expandedAddr === entry.sessionAddr}
          onToggle={(): void => handleToggle(entry.sessionAddr)}
          onOpenSession={handleOpenAccount}
          onOpenRealm={handleOpenRealm}
          onRevoke={(): void => handleRevokeOne(entry.sessionAddr)}
        />
      ))}

      <BottomFixedButtonGroup
        filled
        leftButton={{ text: 'Close', onClick: goBack }}
        rightButton={{
          text: 'Revoke All',
          danger: true,
          disabled: revokeableEntries.length === 0 || !masterAddress,
          onClick: handleRevokeAll,
        }}
      />
    </Container>
  );
};

export default ManageSessions;
