import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
import { SideMenuLayout } from '@components/pages/router/side-menu-layout';
import { AccountAddressesPopover } from '@components/pages/router/top-menu/account-addresses-popover';
import mixins from '@styles/mixins';

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  padding: 0px 20px 0px 12px;
  border-bottom: 1px solid ${getTheme('neutral', '_7')};
`;

const Header = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  height: 100%;
`;

const StyledSideWrapper = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-start' })};
  gap: 8px;
  height: 100%;
`;

const StyledCopyIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: ${getTheme('neutral', '_3')};
  flex-shrink: 0;

  &:hover {
    color: ${getTheme('neutral', 'a')};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

export const TopMenu = ({ disabled }: { disabled?: boolean }): JSX.Element => {
  const { establishService } = useAdenaContext();
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState('');
  const [protocol, setProtocol] = useState('');
  const { currentAccount } = useCurrentAccount();
  const toggleMenuHandler = (): void => setOpen(!open);
  const [isEstablish, setIsEstablish] = useState(false);
  const location = useLocation();
  const [currentAccountName, setCurrentAccountName] = useState('');
  const { accountNames } = useAccountName();
  const { currentNetwork } = useNetwork();

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
      setPopoverY(rect.bottom + 4);
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

  const networkTooltip = ((): string => {
    const host = hostname && hostname.includes('.') ? hostname : 'chrome-extension';
    return `You are connected to ${host}`;
  })();

  return !disabled ? (
    <Wrapper>
      <Header>
        <StyledSideWrapper>
          <AccountSelectorButton
            name={formatNickname(currentAccountName, 12)}
            onClick={toggleMenuHandler}
          />
          <StyledCopyIconButton
            ref={copyButtonRef}
            type='button'
            onMouseEnter={handleCopyIconMouseEnter}
            onMouseLeave={handleCopyIconMouseLeave}
            aria-label='Copy address'
          >
            <IconCopy />
          </StyledCopyIconButton>
        </StyledSideWrapper>
        <StyledSideWrapper>
          <NetworkIconButton isConnected={isEstablish} tooltipText={networkTooltip} />
          <HamburgerMenuBtn type='button' onClick={toggleMenuHandler} />
        </StyledSideWrapper>
      </Header>
      <SideMenuLayout open={open} setOpen={setOpen} />
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
