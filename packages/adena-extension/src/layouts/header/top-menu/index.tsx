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
  const [url, setUrl] = useState('');
  const [currentAccount] = useCurrentAccount();
  const toggleMenuHandler = () => setOpen(!open);
  const [isEstablish, setIsEstablish] = useState(false);
  const location = useLocation();
  const [currentAccountAddress, setCurrentAccountAddress] = useState('');
  const [currentAccountName, setCurrentAccountName] = useState('');

  useEffect(() => {
    initAccountInfo();
  }, [currentAccount, hostname]);

  useEffect(() => {
    getCurrentUrl().then(async (currentUrl) => {
      const hostname = new URL(currentUrl as string).hostname;
      const href = new URL(currentUrl as string).href;
      if (hostname !== "") {
        setHostname(hostname);
        setUrl(href);
      }
    });
  }, [location]);

  const initAccountInfo = async () => {
    if (!currentAccount) {
      return;
    }
    const { address, name } = currentAccount.data;
    setCurrentAccountAddress(address ?? "");
    setCurrentAccountName(name ?? '');

    const siteName = getSiteName(hostname);
    const isEstablished = await establishService.isEstablished(siteName, address);
    setIsEstablish(isEstablished);
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
        <CopyTooltip copyText={currentAccountAddress}>
          <Text type='body1Bold' display='inline-flex'>
            {formatNickname(currentAccountName, 12)}
            <Text type='body1Reg' color={theme.color.neutral[9]}>
              {` (${formatAddress(currentAccountAddress)})`}
            </Text>
          </Text>
        </CopyTooltip>
        <StatusDot status={isEstablish} tooltipText={tooltipTextMaker(hostname, isEstablish)} />
      </Header>
      <SubMenu open={open} setOpen={setOpen} onClick={toggleMenuHandler} />
    </Wrapper>
  ) : <></>;
};
