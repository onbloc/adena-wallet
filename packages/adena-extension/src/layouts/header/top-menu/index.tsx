import React, { useEffect, useState } from 'react';
import theme from '@styles/theme';
import Text from '@components/text';
import styled from 'styled-components';
import { CopyTooltip } from '@components/tooltips';
import { StatusDot } from '@components/status-dot';
import { HamburgerMenuBtn } from '@components/buttons/hamburger-menu-button';
import SubMenu from '@layouts/sub-menu';
import { useCurrentAccount } from '@hooks/use-current-account';
import { formatAddress, formatNickname } from '@common/utils/client-utils';
import { WalletService } from '@services/index';
import { useWallet } from '@hooks/use-wallet';
import { useLocation } from 'react-router-dom';
import { WalletAccountRepository } from '@repositories/wallet';
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

const tooltipTextMaker = (hostname: string, isEstablish: boolean): string => {
  let currentHostname = hostname;
  if (!hostname.includes('.')) {
    currentHostname = 'chrome-extension';
  }
  return isEstablish ? `You are connected to ${currentHostname}` : `You are not connected to ${currentHostname}`;
}

export const TopMenu = ({ disabled }: { disabled?: boolean }) => {
  const { accountService, establishService } = useAdenaContext();
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState('');
  const [currentAccount] = useCurrentAccount();
  const toggleMenuHandler = () => setOpen(!open);
  const [isEstablish, setIsEstablish] = useState(false);
  const [wallet] = useWallet();
  const location = useLocation();
  const [currentAccountAddress, setCurrentAccountAddress] = useState('');
  const [currentAccountName, setCurrentAccountName] = useState('');

  useEffect(() => {
    initAccountInfo();
  }, [currentAccount]);

  useEffect(() => {
    getCurrentUrl().then(async (currentUrl) => {
      const hostname = new URL(currentUrl as string).hostname;
      const address = currentAccount?.getAddress() ?? "";
      establishService.isEstablished(hostname, address).then((result) => {
        setIsEstablish(result);
        setHostname(hostname);
      });
    });
  }, [wallet, location]);

  const initAccountInfo = async () => {
    const address = currentAccount?.getAddress() ?? "";
    setCurrentAccountAddress(address);

    let currentAccountName = currentAccount?.data.name;
    if (!currentAccountName) {
      const accounts = await accountService.getAccounts();
      const walletAccount = accounts.find(account => account.getAddress() === currentAccountAddress);
      currentAccountName = walletAccount?.data.name ?? '';
    }
    setCurrentAccountName(currentAccountName);
  };

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
