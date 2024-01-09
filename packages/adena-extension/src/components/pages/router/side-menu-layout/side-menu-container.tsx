import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Account } from 'adena-module';

import { formatNickname, maxFractionDigits } from '@common/utils/client-utils';
import SideMenu from '@components/pages/router/side-menu/side-menu';
import { useAccountName } from '@hooks/use-account-name';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import { useNetwork } from '@hooks/use-network';
import { useTokenBalance } from '@hooks/use-token-balance';
import { RoutePath } from '@router/path';

import { SideMenuAccountInfo, TokenBalanceType } from '@types';

interface SideMenuContainerProps {
  open: boolean;
  setOpen: (opened: boolean) => void;
}

const SideMenuContainer: React.FC<SideMenuContainerProps> = ({ open, setOpen }) => {
  const { walletService } = useAdenaContext();
  const navigate = useNavigate();
  const { changeCurrentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const { accountNames } = useAccountName();
  const { accounts } = useLoadAccounts();
  const { accountNativeBalances } = useTokenBalance();
  const [locked, setLocked] = useState(true);
  const { currentAccount } = useCurrentAccount();
  const [sideMenuAccounts, setSideMenuAccounts] = useState<SideMenuAccountInfo[]>([]);

  useEffect(() => {
    if (!open) {
      setLocked(true);
    }
    walletService.isLocked().then(setLocked);
  }, [walletService, open]);

  const currentAccountId = useMemo(() => {
    return currentAccount?.id || null;
  }, [currentAccount]);

  const getSideMenuAccounts = useCallback(async () => {
    if (locked) {
      return [];
    }
    if (accounts.length === 0 || !currentNetwork) {
      return [];
    }

    function mapBalance(
      accountNativeBalances: { [key in string]: TokenBalanceType },
      account: Account,
    ): string {
      const amount = accountNativeBalances[account.id]?.amount;
      if (!amount) {
        return '-';
      }
      return `${maxFractionDigits(amount.value, 6)} ${amount.denom}`;
    }

    return Promise.all(accounts.map(async (account) => ({
      accountId: account.id,
      name: formatNickname(accountNames[account.id] || account.name, 10),
      address: await account.getAddress(currentNetwork.addressPrefix),
      type: account.type,
      balance: mapBalance(accountNativeBalances, account),
    })));
  }, [locked, accountNames, accounts, accountNativeBalances, currentNetwork]);

  const movePage = useCallback(
    async (link: string) => {
      setOpen(false);
      navigate(link);
    },
    [navigate, setOpen],
  );

  const openLink = useCallback(
    async (link: string) => {
      setOpen(false);
      window.open(link, '_blank');
    },
    [setOpen],
  );

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
    navigate(RoutePath.Login, { replace: true });
  }, [walletService, open, navigate]);

  const close = useCallback(async () => {
    setOpen(false);
  }, [setOpen]);

  useEffect(() => {
    getSideMenuAccounts().then(setSideMenuAccounts);
  }, [getSideMenuAccounts]);

  return (
    <SideMenu
      locked={locked}
      currentAccountId={currentAccountId}
      accounts={sideMenuAccounts}
      changeAccount={changeAccount}
      movePage={movePage}
      openLink={openLink}
      lock={lock}
      close={close}
    />
  );
};

export default SideMenuContainer;
