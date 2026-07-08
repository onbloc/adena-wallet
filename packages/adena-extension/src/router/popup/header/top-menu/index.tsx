import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { isSessionAccount, SessionAccount } from 'adena-module';

import {
  HamburgerMenuBtn,
  NetworkIconButton,
  AccountSelectorButton,
} from '@components/atoms';
import IconCopy from '@assets/icon-copy';
import IconThunder from '@assets/icon-thunder';

import { getTheme } from '@styles/theme';
import { useCurrentAccount } from '@hooks/use-current-account';
import { formatNickname, getSiteName } from '@common/utils/client-utils';
import { useAdenaContext } from '@hooks/use-context';
import { useAccountName } from '@hooks/use-account-name';
import { useAccountListInfos } from '@hooks/use-account-list-infos';
import { useNetwork } from '@hooks/use-network';
import { useAccountChainAddresses } from '@hooks/use-account-chain-addresses';
import { useSessions } from '@hooks/use-sessions';
import { useCurrentSessionChainData } from '@hooks/wallet/use-current-session-chain-data';
import { useVisibleAccounts } from '@hooks/use-visible-accounts';
import useLink from '@hooks/use-link';
import useAppNavigate from '@hooks/use-app-navigate';
import { AccountAddressesPopover } from '@components/pages/router/top-menu/account-addresses-popover';
import { SessionOverviewPopover } from '@components/pages/router/top-menu/session-overview-popover';
import UnresponsiveNetworksIndicator from '@router/popup/header/unresponsive-networks-indicator';
import mixins from '@styles/mixins';
import { RoutePath } from '@types';

import { useHoverPopover } from './use-hover-popover';

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  padding: 0px 20px;
  border-bottom: 1px solid ${getTheme('neutral', '_7')};
`;

const Header = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  height: 100%;
`;

const StyledLeftSideWrapper = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-start' })};
  gap: 8px;
  height: 100%;
`;

const StyledRightSideWrapper = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-start' })};
  gap: 12px;
  height: 100%;
`;

const StyledSessionAccountButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: ${getTheme('neutral', '_1')};
`;

const StyledCopyIconButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ isActive, theme }): string => (isActive ? theme.neutral._1 : theme.neutral.a)};
  flex-shrink: 0;

  &:hover {
    color: ${getTheme('neutral', '_1')};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const COPY_POPOVER_WIDTH = 220;
const SESSION_POPOVER_RIGHT_MARGIN = 16;

export const TopMenu = ({ disabled }: { disabled?: boolean }): JSX.Element => {
  const navigate = useNavigate();
  const { goBack } = useAppNavigate();
  const { establishService } = useAdenaContext();
  const [hostname, setHostname] = useState('');
  const [protocol, setProtocol] = useState('');
  const { currentAccount, currentAddress } = useCurrentAccount();
  const [isEstablish, setIsEstablish] = useState(false);
  const location = useLocation();

  const matchesArea = (path: string, base: string): boolean =>
    path === base || path.startsWith(`${base}/`);
  const isOnSettings = matchesArea(location.pathname, RoutePath.Setting);
  const isOnAccounts = matchesArea(location.pathname, RoutePath.Accounts);

  const goToAccounts = (): void => {
    if (isOnAccounts) {
      goBack();
      return;
    }
    if (isOnSettings) {
      navigate(RoutePath.Accounts, { replace: true });
      return;
    }
    navigate(RoutePath.Accounts);
  };
  const goToSettings = (): void => {
    if (isOnSettings) {
      goBack();
      return;
    }
    if (isOnAccounts) {
      navigate(RoutePath.Setting, { replace: true });
      return;
    }
    navigate(RoutePath.Setting);
  };
  const [currentAccountName, setCurrentAccountName] = useState('');
  const { accountNames } = useAccountName();
  const { currentNetwork, unresponsiveNetworks } = useNetwork();
  const { openScannerLink } = useLink();
  const { sessions } = useSessions();
  const accountListPrefetchAccounts = useVisibleAccounts();
  useAccountListInfos(accountListPrefetchAccounts);

  const copyPopover = useHoverPopover<HTMLButtonElement>();
  const sessionPopover = useHoverPopover<HTMLButtonElement>();
  const [copyPosition, setCopyPosition] = useState({ x: 0, y: 0 });
  const [sessionPosition, setSessionPosition] = useState({ caretRight: 0, y: 0 });

  const chainAddressEntries = useAccountChainAddresses({ sessionAddressMode: 'session' });

  const handleCopyIconMouseEnter = useCallback(() => {
    copyPopover.cancelClose();
    const anchor = copyPopover.anchorRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const iconCenterX = rect.left + rect.width / 2;
      const popoverLeft = (window.innerWidth - COPY_POPOVER_WIDTH) / 2;
      setCopyPosition({ x: iconCenterX - popoverLeft, y: rect.bottom + 16 });
    }
    copyPopover.setOpen(true);
  }, [copyPopover]);

  const handleSessionIconMouseEnter = useCallback(() => {
    sessionPopover.cancelClose();
    const anchor = sessionPopover.anchorRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const iconCenterX = rect.left + rect.width / 2;
      const caretRight = window.innerWidth - SESSION_POPOVER_RIGHT_MARGIN - iconCenterX;
      setSessionPosition({ caretRight, y: rect.bottom + 16 });
    }
    sessionPopover.setOpen(true);
  }, [sessionPopover]);

  // Close session popover when current account stops being a SessionAccount.
  useEffect(() => {
    if (!currentAccount || !isSessionAccount(currentAccount)) {
      sessionPopover.setOpen(false);
    }
  }, [currentAccount, sessionPopover]);

  useEffect(() => {
    initAccountInfo();
  }, [currentAccount, hostname, accountNames]);

  useEffect(() => {
    getCurrentUrl().then(async (currentUrl) => {
      const hostname = new URL(currentUrl as string).hostname;
      const protocol = new URL(currentUrl as string).protocol;
      if (hostname !== '') {
        setHostname(hostname);
        setProtocol(protocol);
      }
    });
  }, [location.pathname]);

  useEffect(() => {
    updateEstablished();
  }, [location.pathname, hostname, currentAccount, currentNetwork]);

  const initAccountInfo = async (): Promise<void> => {
    if (!currentAccount) {
      return;
    }
    const name = accountNames[currentAccount.id] || currentAccount.name;
    setCurrentAccountName(name ?? '');

    if (hostname !== '') {
      const siteName = getSiteName(protocol, hostname);
      const isEstablished = await establishService.isEstablishedBy(currentAccount.id, siteName);
      setIsEstablish(isEstablished);
    }
  };

  const updateEstablished = async (): Promise<void> => {
    if (currentAccount && hostname !== '') {
      const siteName = getSiteName(protocol, hostname);
      const isEstablished = await establishService.isEstablishedBy(currentAccount.id, siteName);
      setIsEstablish(isEstablished);
    }
  };

  const getCurrentUrl = (): Promise<unknown> => {
    return new Promise((resolver) => {
      const queryOptions = { active: true, lastFocusedWindow: true };
      chrome.tabs.query(queryOptions).then((currentTabs) => {
        if (currentTabs.length > 0 && currentTabs[0].url) {
          resolver(currentTabs[0].url);
        }
      });
    });
  };

  const displayHostname = hostname && hostname.includes('.') ? hostname : 'chrome-extension';
  const isSession = currentAccount !== null && isSessionAccount(currentAccount);
  const sessionMetadata =
    isSession && currentAddress
      ? sessions.find((s) => s.sessionAddr === currentAddress)
      : undefined;
  const sessionConfig = isSession ? (currentAccount as SessionAccount).sessionConfig : null;
  const sessionChainData = useCurrentSessionChainData(
    sessionConfig?.masterAddress,
    isSession ? currentAddress ?? undefined : undefined,
  );

  const handleOpenAccount = useCallback(
    (address: string) => openScannerLink(`/account/${address}`),
    [openScannerLink],
  );
  const handleOpenRealm = useCallback(
    (path: string) => openScannerLink('/realms/details', { path }),
    [openScannerLink],
  );

  return !disabled ? (
    <Wrapper>
      <Header>
        <StyledLeftSideWrapper>
          <AccountSelectorButton
            name={formatNickname(currentAccountName, 12)}
            onClick={goToAccounts}
          />
          <StyledCopyIconButton
            ref={copyPopover.anchorRef}
            type='button'
            isActive={copyPopover.open}
            onMouseEnter={handleCopyIconMouseEnter}
            onMouseLeave={copyPopover.onAnchorMouseLeave}
            aria-label='Copy address'
          >
            <IconCopy />
          </StyledCopyIconButton>
        </StyledLeftSideWrapper>
        <StyledRightSideWrapper>
          <UnresponsiveNetworksIndicator networks={unresponsiveNetworks} />
          {isSession && (
            <StyledSessionAccountButton
              ref={sessionPopover.anchorRef}
              type='button'
              aria-label='Session account overview'
              onMouseEnter={handleSessionIconMouseEnter}
              onMouseLeave={sessionPopover.onAnchorMouseLeave}
            >
              <IconThunder />
            </StyledSessionAccountButton>
          )}
          <NetworkIconButton isConnected={isEstablish} hostname={displayHostname} />
          <HamburgerMenuBtn type='button' onClick={goToSettings} />
        </StyledRightSideWrapper>
      </Header>
      <AccountAddressesPopover
        open={copyPopover.open}
        positionX={copyPosition.x}
        positionY={copyPosition.y}
        onMouseEnter={copyPopover.onPopoverMouseEnter}
        onMouseLeave={copyPopover.onPopoverMouseLeave}
        entries={chainAddressEntries}
      />
      {sessionConfig && (
        <SessionOverviewPopover
          open={sessionPopover.open}
          positionY={sessionPosition.y}
          caretRight={sessionPosition.caretRight}
          onMouseEnter={sessionPopover.onPopoverMouseEnter}
          onMouseLeave={sessionPopover.onPopoverMouseLeave}
          masterAddress={sessionConfig.masterAddress}
          expiresAt={sessionConfig.expiresAt ?? 0}
          allowPaths={
            sessionChainData?.allowPaths ??
            sessionMetadata?.allowPaths ??
            sessionConfig.allowPaths ??
            []
          }
          spendLimitUgnot={sessionChainData?.spendLimit || sessionConfig.spendLimit}
          spendPeriod={
            sessionChainData?.spendPeriod ??
            sessionConfig.spendPeriod ??
            sessionMetadata?.spendPeriod
          }
          spendUsedUgnot={sessionChainData?.spendUsed ?? sessionMetadata?.spendUsed}
          spendReset={sessionChainData?.spendReset ?? sessionMetadata?.spendReset}
          onOpenAccount={handleOpenAccount}
          onOpenRealm={handleOpenRealm}
        />
      )}
    </Wrapper>
  ) : (
    <></>
  );
};
