import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import {
  HamburgerMenuBtn,
  NetworkIconButton,
  AccountSelectorButton,
} from '@components/atoms';
import IconCopy from '@assets/icon-copy';

import { getTheme } from '@styles/theme';
import { useCurrentAccount } from '@hooks/use-current-account';
import { formatNickname, getSiteName } from '@common/utils/client-utils';
import { useAdenaContext } from '@hooks/use-context';
import { useAccountName } from '@hooks/use-account-name';
import { useNetwork } from '@hooks/use-network';
import { useAccountChainAddresses } from '@hooks/use-account-chain-addresses';
import { AccountAddressesPopover } from '@components/pages/router/top-menu/account-addresses-popover';
import UnresponsiveNetworksIndicator from '@router/popup/header/unresponsive-networks-indicator';
import mixins from '@styles/mixins';
import { RoutePath } from '@types';

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

export const TopMenu = ({ disabled }: { disabled?: boolean }): JSX.Element => {
  const navigate = useNavigate();
  const { establishService } = useAdenaContext();
  const [hostname, setHostname] = useState('');
  const [protocol, setProtocol] = useState('');
  const { currentAccount } = useCurrentAccount();
  const goToAccounts = (): void => navigate(RoutePath.Accounts);
  const goToSettings = (): void => navigate(RoutePath.Setting);
  const [isEstablish, setIsEstablish] = useState(false);
  const location = useLocation();
  const [currentAccountName, setCurrentAccountName] = useState('');
  const { accountNames } = useAccountName();
  const { currentNetwork, unresponsiveNetworks } = useNetwork();

  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverX, setPopoverX] = useState(0);
  const [popoverY, setPopoverY] = useState(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chainAddressEntries = useAccountChainAddresses();

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setPopoverOpen(false), 120);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleCopyIconMouseEnter = useCallback(() => {
    cancelClose();
    if (copyButtonRef.current) {
      const rect = copyButtonRef.current.getBoundingClientRect();
      const POPOVER_WIDTH = 220;
      const iconCenterX = rect.left + rect.width / 2;
      const popoverLeft = (window.innerWidth - POPOVER_WIDTH) / 2;
      setPopoverX(iconCenterX - popoverLeft);
      setPopoverY(rect.bottom + 16);
    }
    setPopoverOpen(true);
  }, [cancelClose]);

  const handleCopyIconMouseLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  useEffect(() => {
    if (!popoverOpen) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [popoverOpen]);

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

  return !disabled ? (
    <Wrapper>
      <Header>
        <StyledLeftSideWrapper>
          <AccountSelectorButton
            name={formatNickname(currentAccountName, 12)}
            onClick={goToAccounts}
          />
          <StyledCopyIconButton
            ref={copyButtonRef}
            type='button'
            isActive={popoverOpen}
            onMouseEnter={handleCopyIconMouseEnter}
            onMouseLeave={handleCopyIconMouseLeave}
            aria-label='Copy address'
          >
            <IconCopy />
          </StyledCopyIconButton>
        </StyledLeftSideWrapper>
        <StyledRightSideWrapper>
          <UnresponsiveNetworksIndicator networks={unresponsiveNetworks} />
          <NetworkIconButton isConnected={isEstablish} hostname={displayHostname} />
          <HamburgerMenuBtn type='button' onClick={goToSettings} />
        </StyledRightSideWrapper>
      </Header>
      <AccountAddressesPopover
        open={popoverOpen}
        positionX={popoverX}
        positionY={popoverY}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        entries={chainAddressEntries}
      />
    </Wrapper>
  ) : (
    <></>
  );
};
