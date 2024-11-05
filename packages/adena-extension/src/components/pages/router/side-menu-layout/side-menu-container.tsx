import { Account } from 'adena-module';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatNickname } from '@common/utils/client-utils';
import SideMenu from '@components/pages/router/side-menu/side-menu';
import { useAccountName } from '@hooks/use-account-name';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import { useNetwork } from '@hooks/use-network';
import { useTokenBalance } from '@hooks/use-token-balance';

import { SCANNER_URL } from '@common/constants/resource.constant';
import { makeQueryString } from '@common/utils/string-utils';
import useLink from '@hooks/use-link';
import { useQuery } from '@tanstack/react-query';
import { RoutePath, SideMenuAccountInfo, TokenBalanceType } from '@types';

interface SideMenuContainerProps {
  open: boolean;
  setOpen: (opened: boolean) => void;
}

const SideMenuContainer: React.FC<SideMenuContainerProps> = ({ open, setOpen }) => {
  const { openLink, openRegister } = useLink();
  const { walletService } = useAdenaContext();
  const navigate = useNavigate();
  const { changeCurrentAccount } = useCurrentAccount();
  const { currentNetwork, scannerParameters } = useNetwork();
  const { accountNames } = useAccountName();
  const { accounts, loadAccounts } = useLoadAccounts();
  const { accountNativeBalanceMap } = useTokenBalance();
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
    return currentNetwork.linkUrl || SCANNER_URL;
  }, [currentNetwork]);

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
    await loadAccounts();
    navigate(RoutePath.Login, { replace: true });
  }, [walletService, navigate]);

  const close = useCallback(async () => {
    setOpen(false);
  }, []);

  const { data: sideMenuAccounts = [] } = useQuery<SideMenuAccountInfo[]>(
    ['sideMenuAccounts', accountNames, accounts, accountNativeBalanceMap, currentNetwork],
    () => {
      function mapBalance(
        accountNativeBalanceMap: Record<string, TokenBalanceType>,
        account: Account,
      ): string {
        const amount = accountNativeBalanceMap[account.id]?.amount;
        if (!amount) {
          return '-';
        }
        return `${amount.value} ${amount.denom}`;
      }

      return Promise.all(
        accounts.map(async (account) => ({
          accountId: account.id,
          name: formatNickname(accountNames[account.id] || account.name, 10),
          address: await account.getAddress(currentNetwork.addressPrefix),
          type: account.type,
          balance: mapBalance(accountNativeBalanceMap, account),
        })),
      );
    },
  );

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
