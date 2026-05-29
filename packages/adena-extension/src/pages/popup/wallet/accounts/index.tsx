import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SCANNER_URL } from '@common/constants/resource.constant';
import { makeQueryString } from '@common/utils/string-utils';
import IconAddRounded from '@assets/icon-add-rounded';
import { BottomFixedButton } from '@components/molecules';
import SideMenuAccountList from '@components/pages/router/side-menu-account-list/side-menu-account-list';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAccountListInfos } from '@hooks/use-account-list-infos';
import { useCurrentAccount } from '@hooks/use-current-account';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { useVisibleAccounts } from '@hooks/use-visible-accounts';
import { useNetworkProfile } from '@hooks/use-network-profile';
import { RoutePath } from '@types';

import { AccountsWrapper, AddAccountButton } from './accounts.styles';

export const Accounts = (): JSX.Element => {
  const { navigate, goBack } = useAppNavigate<RoutePath.Accounts>();
  const routerNavigate = useNavigate();
  const { openLink, openRegister } = useLink();
  const { currentAccount, changeCurrentAccount } = useCurrentAccount();
  const { scannerParameters } = useNetwork();
  const profile = useNetworkProfile();
  const accounts = useVisibleAccounts();
  const [focusedAccountId, setFocusedAccountId] = useState<string | null>(null);

  const currentAccountId = useMemo(() => currentAccount?.id ?? null, [currentAccount]);

  const scannerUrl = useMemo(() => profile?.linkUrl || SCANNER_URL, [profile]);
  const scannerQueryString = useMemo(
    () => (scannerParameters ? makeQueryString(scannerParameters) : ''),
    [scannerParameters],
  );

  const { data: accountInfos = [] } = useAccountListInfos(accounts);

  const changeAccount = useCallback(
    async (accountId: string) => {
      if (accountId === currentAccountId) {
        goBack();
        return;
      }
      const account = accounts.find((current) => current.id === accountId);
      if (!account) {
        return;
      }
      await changeCurrentAccount(account);
      navigate(RoutePath.Wallet, { replace: true });
    },
    [accounts, currentAccountId, changeCurrentAccount, goBack, navigate],
  );

  const focusAccountId = useCallback((accountId: string | null) => {
    setFocusedAccountId(accountId);
  }, []);

  const moveGnoscan = useCallback(
    (address: string) => {
      const url = scannerQueryString
        ? `${scannerUrl}/account/${address}?${scannerQueryString}`
        : `${scannerUrl}/account/${address}`;
      openLink(url);
    },
    [openLink, scannerQueryString, scannerUrl],
  );

  const moveAccountDetail = useCallback(
    (accountId: string) => {
      routerNavigate(RoutePath.AccountDetails.replace(':accountId', accountId));
    },
    [routerNavigate],
  );

  const onClickAddAccount = useCallback(() => {
    openRegister();
    window.close();
  }, [openRegister]);

  const onClickClose = useCallback(() => {
    goBack();
  }, [goBack]);

  return (
    <AccountsWrapper>
      <div className='list'>
        <SideMenuAccountList
          currentAccountId={currentAccountId}
          accounts={accountInfos}
          focusedAccountId={focusedAccountId}
          changeAccount={changeAccount}
          focusAccountId={focusAccountId}
          moveGnoscan={moveGnoscan}
          moveAccountDetail={moveAccountDetail}
        />

        <AddAccountButton type='button' onClick={onClickAddAccount}>
          <IconAddRounded />
          <span>Add Account</span>
        </AddAccountButton>
      </div>

      <BottomFixedButton onClick={onClickClose} />
    </AccountsWrapper>
  );
};

export default Accounts;
