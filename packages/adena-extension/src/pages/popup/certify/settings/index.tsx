import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { FullButtonRightIcon, Text } from '@components/atoms';
import { IconName } from '@components/atoms/icon';
import Toggle from '@components/atoms/toggle';
import { BottomFixedButton } from '@components/molecules';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import useAppNavigate from '@hooks/use-app-navigate';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import { CommandMessage } from '@inject/message/command-message';
import { RoutePath } from '@types';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

const menuMakerInfo: {
  title: string;
  leftIcon: IconName;
  navigatePath:
    | RoutePath.ConnectedApps
    | RoutePath.AddressBook
    | RoutePath.ChangeNetwork
    | RoutePath.SecurityPrivacy
    | RoutePath.AboutAdena;
}[] = [
  {
    title: 'Connected Apps',
    leftIcon: 'iconGlobe',
    navigatePath: RoutePath.ConnectedApps,
  },
  {
    title: 'Change Network',
    leftIcon: 'iconMapRoute',
    navigatePath: RoutePath.ChangeNetwork,
  },
  {
    title: 'Address Book',
    leftIcon: 'iconBook',
    navigatePath: RoutePath.AddressBook,
  },
  {
    title: 'Security & Privacy',
    leftIcon: 'iconSecurity',
    navigatePath: RoutePath.SecurityPrivacy,
  },
  {
    title: 'About Adena',
    leftIcon: 'iconAdenaMark',
    navigatePath: RoutePath.AboutAdena,
  },
];

export const Settings = (): JSX.Element => {
  const { navigate, goBack } = useAppNavigate();
  const { walletService } = useAdenaContext();
  const { clearWallet } = useWalletContext();
  const { loadAccounts } = useLoadAccounts();
  const [isSidePanelOn, setIsSidePanelOn] = useState(false);
  const [supportsSidePanel] = useState(
    () => typeof chrome !== 'undefined' && Boolean(chrome.sidePanel?.getPanelBehavior),
  );
  const [activeTabId, setActiveTabId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!supportsSidePanel || !chrome.sidePanel?.getPanelBehavior) return;
    chrome.sidePanel
      .getPanelBehavior()
      .then((behavior) => {
        setIsSidePanelOn(behavior.openPanelOnActionClick ?? false);
      })
      .catch(() => undefined);
  }, [supportsSidePanel]);

  useEffect(() => {
    if (!supportsSidePanel) return;
    chrome.tabs
      .query({ active: true, lastFocusedWindow: true })
      .then((tabs) => {
        if (tabs[0]?.id !== undefined) setActiveTabId(tabs[0].id);
      })
      .catch(() => undefined);
  }, [supportsSidePanel]);

  const onToggleSidePanel = useCallback(
    (activated: boolean) => {
      setIsSidePanelOn(activated);

      if (activated && activeTabId !== undefined && chrome.sidePanel?.open) {
        chrome.sidePanel.open({ tabId: activeTabId }).catch(() => undefined);
      }

      chrome.runtime
        .sendMessage({ type: 'SET_SIDE_PANEL_MODE', enabled: activated })
        .catch(() => undefined)
        .finally(() => {
          window.close();
        });
    },
    [activeTabId],
  );

  const onClickLockWallet = useCallback(async () => {
    await walletService.lockWallet();
    await clearWallet();
    try {
      await chrome.runtime.sendMessage(CommandMessage.command('clearPopup'));
    } catch (error) {
      console.warn(error);
    }
    await loadAccounts();
    navigate(RoutePath.Login, { replace: true });
  }, [walletService, clearWallet, loadAccounts, navigate]);

  return (
    <Wrapper>
      <div className='title-wrapper'>
        <span className='title'>Settings</span>
      </div>
      <FullButtonRightIcon
        title='Lock Wallet'
        leftIcon='iconLock'
        icon='NONE'
        onClick={onClickLockWallet}
      />
      <Divider />
      {supportsSidePanel && (
        <SidePanelRow>
          <SidePanelLabel>
            <Text type='body1Bold'>Use Side Panel</Text>
          </SidePanelLabel>
          <Toggle activated={isSidePanelOn} onToggle={onToggleSidePanel} />
        </SidePanelRow>
      )}
      {menuMakerInfo.map((v, i) => (
        <FullButtonRightIcon
          key={i}
          title={v.title}
          leftIcon={v.leftIcon}
          onClick={(): void => navigate(v.navigatePath)}
        />
      ))}
      <BottomFixedButton text='Close' onClick={goBack} />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  padding-bottom: 116px;
  overflow-y: auto;

  .title-wrapper {
    width: 100%;
    margin-bottom: 12px;

    .title {
      ${fonts.header4};
    }
  }
`;

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background-color: ${getTheme('neutral', 'b')};
  margin: 12px 0;
`;

const SidePanelRow = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between', align: 'center' })};
  width: 100%;
  height: 54px;
  padding: 0px 24px 0px 20px;
  border-radius: 18px;
  background-color: ${getTheme('neutral', '_7')};
  margin-bottom: 12px;
`;

const SidePanelLabel = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center' })};
`;
