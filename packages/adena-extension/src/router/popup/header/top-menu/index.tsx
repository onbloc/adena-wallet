import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';

import { Text, CopyTooltip, StatusDot, HamburgerMenuBtn } from '@components/atoms';

import { getTheme } from '@styles/theme';
import { useCurrentAccount } from '@hooks/use-current-account';
import { formatAddress, formatNickname, getSiteName } from '@common/utils/client-utils';
import { useAdenaContext } from '@hooks/use-context';
import { useAccountName } from '@hooks/use-account-name';
import { useNetwork } from '@hooks/use-network';
import { SideMenuLayout } from '@components/pages/router/side-menu-layout';
import mixins from '@styles/mixins';
import { createPopupWindow } from '@common/utils/browser-utils';
import useSessionParams from '@hooks/use-session-state';
import { PopWindowButton } from '@components/atoms/pop-window-button';
import useDNSResolver from '@hooks/use-dns';

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
  position: relative;
  & > img {
    ${mixins.positionCenter()}
  }
`;

const StyledCenterWrapper = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'flex-start' })};
  width: auto;
  height: 100%;
  gap: 8px;
  & > img {
    ${mixins.positionCenter()}
  }
`;

const StyledRightWrapper = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'flex-start' })};
  width: 15px;
  height: 100%;
`;

export const TopMenu = ({ disabled }: { disabled?: boolean }): JSX.Element => {
  const theme = useTheme();
  const { isPopup } = useSessionParams();
  const { establishService } = useAdenaContext();
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState('');
  const [protocol, setProtocol] = useState('');
  const [, setUrl] = useState('');
  const { currentAccount, currentAddress } = useCurrentAccount();
  const toggleMenuHandler = (): void => setOpen(!open);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isEstablish, setIsEstablish] = useState(false);
  const location = useLocation();
  const [currentAccountName, setCurrentAccountName] = useState('');
  const { accountNames } = useAccountName();
  const { currentNetwork } = useNetwork();
  const { resolveAddressToDomain, result } = useDNSResolver();

  useEffect(() => {
    if (currentAddress) {
      resolveAddressToDomain(currentAddress);
    }
  }, [currentAddress, resolveAddressToDomain]);

  useEffect(() => {
    initAccountInfo();
  }, [currentAccount, hostname, accountNames]);

  useEffect(() => {
    getCurrentUrl().then(async (currentUrl) => {
      const hostname = new URL(currentUrl as string).hostname;
      const href = new URL(currentUrl as string).href;
      const protocol = new URL(currentUrl as string).protocol;
      if (hostname !== '') {
        setHostname(hostname);
        setUrl(href);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tooltipTextMaker = (hostname: string, isEstablish: boolean): string => {
    let currentHostname = hostname;
    if (!hostname.includes('.')) {
      currentHostname = 'chrome-extension';
    }
    return isEstablish
      ? `You are connected to ${currentHostname}`
      : `You are not connected to ${currentHostname}`;
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

  const popupWindow = (): void => {
    createPopupWindow(location.pathname, location.state);
  };

  return !disabled ? (
    <Wrapper>
      <Header>
        <HamburgerMenuBtn type='button' onClick={toggleMenuHandler} />
        <StyledCenterWrapper>
          <StatusDot status={isEstablish} tooltipText={tooltipTextMaker(hostname, isEstablish)} />
          <div>
            <CopyTooltip copyText={currentAddress || ''}>
              <Text type='body1Bold' display='inline-flex'>
                {formatNickname(currentAccountName, 12)}
                <Text type='body1Reg' color={theme.neutral.a}>
                  {` (${formatAddress(currentAddress || '')})`}
                </Text>
              </Text>
            </CopyTooltip>
            <CopyTooltip copyText={result?.domain || ''}>
              <Text type='body1Reg' >
                {`${formatAddress(result?.domain || '')}`}
              </Text>
            </CopyTooltip>
          </div>
        </StyledCenterWrapper>
        <StyledRightWrapper>
          {isPopup ? <div /> : <PopWindowButton onClick={popupWindow} />}
        </StyledRightWrapper>
      </Header>
      <SideMenuLayout open={open} setOpen={setOpen} />
    </Wrapper>
  ) : (
    <></>
  );
};
