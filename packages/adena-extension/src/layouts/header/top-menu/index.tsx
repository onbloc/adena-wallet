import React, { useEffect, useState } from 'react';
import theme from '@styles/theme';
import Text from '@components/text';
import styled from 'styled-components';
import { CopyTooltip } from '@components/tooltips';
import { StatusDot } from '@components/status-dot';
import { HamburgerMenuBtn } from '@components/buttons/hamburger-menu-button';
import SubMenu from '@layouts/sub-menu';
import { useCurrentAccount } from '@hooks/use-current-account';
import { formatAddress, formatNickname, getSiteName } from '@common/utils/client-utils';
import { useLocation } from 'react-router-dom';
import { useAdenaContext } from '@hooks/use-context';
import { useAccountName } from '@hooks/use-account-name';
import { useNetwork } from '@hooks/use-network';

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  padding: 0px 20px 0px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.neutral[6]};
`;

const Header = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  height: 100%;
  position: relative;
  & > img {
    ${({ theme }) => theme.mixins.positionCenter('absolute')}
  }
`;

export const TopMenu = ({ disabled }: { disabled?: boolean }) => {
  const { establishService } = useAdenaContext();
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState('');
  const [, setUrl] = useState('');
  const { currentAccount, currentAddress } = useCurrentAccount();
  const toggleMenuHandler = () => setOpen(!open);
  const [isEstablish, setIsEstablish] = useState(false);
  const location = useLocation();
  const [currentAccountName, setCurrentAccountName] = useState('');
  const { accountNames } = useAccountName();
  const { currentNetwork } = useNetwork();

  useEffect(() => {
    initAccountInfo();
    console.log(hostname)
  }, [currentAccount, hostname, accountNames]);

  useEffect(() => {
    getCurrentUrl().then(async (currentUrl) => {
      const hostname = new URL(currentUrl as string).hostname;
      const href = new URL(currentUrl as string).href;
      if (hostname !== '') {
        setHostname(hostname);
        setUrl(href);
        console.log(hostname)
        console.log(href)
      }
    });
  }, [location.pathname]);

  useEffect(() => {
    updateEstablished();
  }, [location.pathname, hostname, currentAccount, currentNetwork]);

  const initAccountInfo = async () => {
    if (!currentAccount) {
      return;
    }
    const name = accountNames[currentAccount.id] || currentAccount.name;
    setCurrentAccountName(name ?? '');

    if (hostname !== '') {
      const siteName = getSiteName(hostname);
      const isEstablished = await establishService.isEstablishedBy(currentAccount.id, currentNetwork.networkId, siteName);
      setIsEstablish(isEstablished);
    }
  };

  const updateEstablished = async () => {
    if (currentAccount && hostname !== '') {
      const siteName = getSiteName(hostname);
      const isEstablished = await establishService.isEstablishedBy(currentAccount.id, currentNetwork.networkId, siteName);
      setIsEstablish(isEstablished);
    }
  };

  const tooltipTextMaker = (hostname: string, isEstablish: boolean): string => {
    let currentHostname = hostname;
    if (!hostname.includes('.')) {
      currentHostname = 'chrome-extension';
    }
    return isEstablish ? `You are connected to ${currentHostname}` : `You are not connected to ${currentHostname}`;
  }

  const getCurrentUrl = () => {
    return new Promise((resolver) => {
      const queryOptions = { active: true, lastFocusedWindow: true };
      chrome.tabs.query(queryOptions).then((currentTabs) => {
        if (currentTabs.length > 0 && currentTabs[0].url) {
          resolver(currentTabs[0].url);
        }
      });
    });
  };

  return !disabled ? (
    <Wrapper>
      <Header>
        <HamburgerMenuBtn type='button' onClick={toggleMenuHandler} />
        <CopyTooltip copyText={currentAddress || ''}>
          <Text type='body1Bold' display='inline-flex'>
            {formatNickname(currentAccountName, 12)}
            <Text type='body1Reg' color={theme.color.neutral[9]}>
              {` (${formatAddress(currentAddress || '')})`}
            </Text>
          </Text>
        </CopyTooltip>
        <StatusDot status={isEstablish} tooltipText={tooltipTextMaker(hostname, isEstablish)} />
      </Header>
      <SubMenu open={open} setOpen={setOpen} onClick={toggleMenuHandler} />
    </Wrapper>
  ) : <></>;
};
