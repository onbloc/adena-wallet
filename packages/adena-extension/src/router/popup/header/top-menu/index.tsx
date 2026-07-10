import { isSessionAccount, SessionAccount } from 'adena-module';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import IconCopy from '@assets/icon-copy';
import IconCopyCheck from '@assets/icon-copy-check';
import IconThunder from '@assets/icon-thunder';
import { AccountSelectorButton, HamburgerMenuBtn, NetworkIconButton } from '@components/atoms';

import {
  WALLET_EXPORT_ACCOUNT_ID,
  WALLET_EXPORT_TYPE_STORAGE_KEY,
} from '@common/constants/storage.constant';
import { AdenaStorage } from '@common/storage';
import { isRevokedSessionAccount } from '@common/utils/account-session';
import { formatNickname, getSiteName } from '@common/utils/client-utils';
import { AccountAddressesPopover } from '@components/pages/router/top-menu/account-addresses-popover';
import { SessionAddressWarningPopover } from '@components/pages/router/top-menu/session-address-warning-popover';
import { SessionOverviewPopover } from '@components/pages/router/top-menu/session-overview-popover';
import { useAccountChainAddresses } from '@hooks/use-account-chain-addresses';
import { useAccountListInfos } from '@hooks/use-account-list-infos';
import { useAccountName } from '@hooks/use-account-name';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { useSessions } from '@hooks/use-sessions';
import { useVisibleAccounts } from '@hooks/use-visible-accounts';
import { useCurrentSessionChainData } from '@hooks/wallet/use-current-session-chain-data';
import { useSessionRevocationWatcher } from '@hooks/wallet/use-session-revocation-watcher';
import UnresponsiveNetworksIndicator from '@router/popup/header/unresponsive-networks-indicator';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
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
const SESSION_WARNING_POPOVER_WIDTH = 320;
const SESSION_POPOVER_RIGHT_MARGIN = 16;

export const TopMenu = ({ disabled }: { disabled?: boolean }): JSX.Element => {
  const navigate = useNavigate();
  const { goBack } = useAppNavigate();
  const { establishService } = useAdenaContext();
  const [hostname, setHostname] = useState('');
  const [protocol, setProtocol] = useState('');
  const { currentAccount, currentAddress, currentFundingAddress } = useCurrentAccount();
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
  const { openScannerLink, openSecurity } = useLink();
  const { sessions } = useSessions();
  const accountListPrefetchAccounts = useVisibleAccounts();
  useAccountListInfos(accountListPrefetchAccounts);
  // Header renders on every wallet screen, so this is the single mount point
  // for the 5s chain poll that flags a revoked SessionAccount.
  useSessionRevocationWatcher();

  const copyPopover = useHoverPopover<HTMLButtonElement>();
  const sessionPopover = useHoverPopover<HTMLButtonElement>();
  const [copyPosition, setCopyPosition] = useState({ x: 0, y: 0 });
  const [sessionPosition, setSessionPosition] = useState({ caretRight: 0, y: 0 });

  const chainAddressEntries = useAccountChainAddresses();
  const [addressCopied, setAddressCopied] = useState(false);
  const isSession = currentAccount !== null && isSessionAccount(currentAccount);

  // A SessionAccount address can never receive tokens, so copying it is disabled;
  // hovering the icon shows a warning to use the Master Account instead. For every
  // other account the funding address is the one that can actually receive tokens.
  const handleCopyIconClick = useCallback(() => {
    if (isSession || !currentFundingAddress) {
      return;
    }
    navigator.clipboard.writeText(currentFundingAddress);
    setAddressCopied(true);
  }, [isSession, currentFundingAddress]);

  useEffect(() => {
    if (!addressCopied) {
      return;
    }
    const timer = setTimeout(() => setAddressCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [addressCopied]);

  const handleCopyIconMouseEnter = useCallback(() => {
    copyPopover.cancelClose();
    const anchor = copyPopover.anchorRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const iconCenterX = rect.left + rect.width / 2;
      // Both popovers are centered on screen (left: 50% + translateX(-50%)), so the
      // caret offset must be measured against each popover's own width.
      const popoverWidth = isSession ? SESSION_WARNING_POPOVER_WIDTH : COPY_POPOVER_WIDTH;
      const popoverLeft = (window.innerWidth - popoverWidth) / 2;
      setCopyPosition({ x: iconCenterX - popoverLeft, y: rect.bottom + 16 });
    }
    copyPopover.setOpen(true);
  }, [copyPopover, isSession]);

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
  const sessionMetadata =
    isSession && currentAddress
      ? sessions.find((s) => s.sessionAddr === currentAddress)
      : undefined;
  const sessionConfig = isSession ? (currentAccount as SessionAccount).sessionConfig : null;
  const sessionRevoked = isRevokedSessionAccount(currentAccount, currentAddress, sessions);
  // Stop polling once revoked: the popover then shows the revoked variant and
  // no longer reads the chain overview, so there is nothing to keep current.
  const sessionChainData = useCurrentSessionChainData(
    sessionConfig?.masterAddress,
    isSession && !sessionRevoked ? currentAddress ?? undefined : undefined,
  );

  const handleOpenAccount = useCallback(
    (address: string) => openScannerLink(`/account/${address}`),
    [openScannerLink],
  );
  const handleOpenRealm = useCallback(
    (path: string) => openScannerLink('/realms/details', { path }),
    [openScannerLink],
  );

  const handleRemoveRevokedAccount = useCallback(() => {
    sessionPopover.setOpen(false);
    navigate(RoutePath.RemoveAccount);
  }, [navigate, sessionPopover]);

  // A revoked session key can still hold a balance, so the user must be able to
  // export it before removing the account. The export flow lives in the
  // security page, which runs in its own tab.
  const handleExportRevokedKey = useCallback(async () => {
    if (!currentAccount) {
      return;
    }
    sessionPopover.setOpen(false);
    const sessionStorage = AdenaStorage.session();
    await sessionStorage.set(WALLET_EXPORT_TYPE_STORAGE_KEY, 'PRIVATE_KEY');
    await sessionStorage.set(WALLET_EXPORT_ACCOUNT_ID, currentAccount.id);
    openSecurity();
  }, [currentAccount, openSecurity, sessionPopover]);

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
            onClick={handleCopyIconClick}
            onMouseEnter={handleCopyIconMouseEnter}
            onMouseLeave={copyPopover.onAnchorMouseLeave}
            aria-label={isSession ? 'Session account address info' : 'Copy address'}
          >
            {addressCopied && !isSession ? <IconCopyCheck /> : <IconCopy />}
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
      {isSession ? (
        <SessionAddressWarningPopover
          open={copyPopover.open}
          positionX={copyPosition.x}
          positionY={copyPosition.y}
          onMouseEnter={copyPopover.onPopoverMouseEnter}
          onMouseLeave={copyPopover.onPopoverMouseLeave}
        />
      ) : (
        <AccountAddressesPopover
          open={copyPopover.open}
          positionX={copyPosition.x}
          positionY={copyPosition.y}
          onMouseEnter={copyPopover.onPopoverMouseEnter}
          onMouseLeave={copyPopover.onPopoverMouseLeave}
          entries={chainAddressEntries}
        />
      )}
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
          revoked={sessionRevoked}
          onRemoveAccount={handleRemoveRevokedAccount}
          onExportKey={handleExportRevokedKey}
          onOpenAccount={handleOpenAccount}
          onOpenRealm={handleOpenRealm}
        />
      )}
    </Wrapper>
  ) : (
    <></>
  );
};
