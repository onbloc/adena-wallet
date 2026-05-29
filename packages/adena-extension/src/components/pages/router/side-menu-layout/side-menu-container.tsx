import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import SideMenu from '@components/pages/router/side-menu/side-menu';
import { useAccountListInfos } from '@hooks/use-account-list-infos';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import { useNetwork } from '@hooks/use-network';
import { useVisibleAccounts } from '@hooks/use-visible-accounts';
import { useNetworkProfile } from '@hooks/use-network-profile';

import { SCANNER_URL } from '@common/constants/resource.constant';
import { makeQueryString } from '@common/utils/string-utils';
import useLink from '@hooks/use-link';
import { CommandMessage } from '@inject/message/command-message';
import { RoutePath, SideMenuAccountInfo } from '@types';

interface SideMenuContainerProps {
  open: boolean;
  setOpen: (opened: boolean) => void;
}

const SideMenuContainer: React.FC<SideMenuContainerProps> = ({ open, setOpen }) => {
  const { openLink, openRegister } = useLink();
  const { walletService } = useAdenaContext();
  const { clearWallet } = useWalletContext();
  const navigate = useNavigate();
  const { changeCurrentAccount } = useCurrentAccount();
  const { scannerParameters } = useNetwork();
  const profile = useNetworkProfile();
  const { loadAccounts } = useLoadAccounts();
  const accounts = useVisibleAccounts();
  const [locked, setLocked] = useState(true);
  const { currentAccount } = useCurrentAccount();
  const [latestAccountInfos, setLatestAccountInfos] = useState<SideMenuAccountInfo[]>([]);
  const [focusedAccountId, setFocusedAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setLocked(true);
    }
    walletService.isLocked().then(setLocked);
  }, [walletService, open]);

  const currentAccountId = useMemo(() => {
    return currentAccount?.id || null;
  }, [currentAccount]);

  const scannerUrl = useMemo(() => {
    return profile?.linkUrl || SCANNER_URL;
  }, [profile]);

  const scannerQueryString = useMemo(() => {
    if (scannerParameters) {
      return makeQueryString(scannerParameters);
    }
    return '';
  }, [scannerParameters]);

  const movePage = useCallback(
    async (link: string) => {
      setOpen(false);
      navigate(link);
    },
    [navigate, setOpen],
  );

  const onOpenLink = useCallback(
    async (link: string) => {
      setOpen(false);
      openLink(link);
    },
    [setOpen],
  );

  const focusAccountId = useCallback((accountId: string | null) => {
    setFocusedAccountId(accountId);
  }, []);

  const changeAccount = useCallback(
    async (accountId: string) => {
      setOpen(false);
      const account = accounts.find((current) => current.id === accountId);
      if (!account) {
        return;
      }
      await changeCurrentAccount(account);
      navigate(RoutePath.Wallet, { replace: true });
    },
    [accounts, changeCurrentAccount, setOpen],
  );

  const lock = useCallback(async () => {
    setOpen(false);
    await walletService.lockWallet();
    await clearWallet();

    try {
      await chrome.runtime.sendMessage(CommandMessage.command('clearPopup'));
    } catch (error) {
      console.warn(error);
    }

    await loadAccounts();
    navigate(RoutePath.Login, { replace: true });
  }, [walletService, navigate]);

  const close = useCallback(async () => {
    setOpen(false);
  }, []);

  const { data: sideMenuAccounts = [] } = useAccountListInfos(accounts);

  useEffect(() => {
    if (sideMenuAccounts.length > 0) {
      setLatestAccountInfos(sideMenuAccounts);
    }
  }, [sideMenuAccounts]);

  return (
    <SideMenu
      scannerUrl={scannerUrl}
      scannerQueryString={scannerQueryString}
      locked={locked}
      currentAccountId={currentAccountId}
      accounts={locked ? [] : latestAccountInfos}
      focusedAccountId={focusedAccountId}
      changeAccount={changeAccount}
      focusAccountId={focusAccountId}
      movePage={movePage}
      openLink={onOpenLink}
      openRegister={openRegister}
      lock={lock}
      close={close}
    />
  );
};

export default SideMenuContainer;
