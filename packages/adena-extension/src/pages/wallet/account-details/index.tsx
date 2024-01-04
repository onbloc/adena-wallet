import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isLedgerAccount } from 'adena-module';
import { useParams } from 'react-router-dom';

import AccountDetails from '@components/pages/account-details/account-details';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import { useNetwork } from '@hooks/use-network';
import { useAccountName } from '@hooks/use-account-name';
import { RoutePath } from '@router/path';
import { useCurrentAccount } from '@hooks/use-current-account';
import { CommonFullContentLayout } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigation';

const ACCOUNT_NAME_LENGTH_LIMIT = 23;

const AccountDetailsContainer: React.FC = () => {
  const { accountId } = useParams();
  const { navigate } = useAppNavigate();
  const { accounts } = useLoadAccounts();
  const { currentNetwork } = useNetwork();
  const { accountNames, changeAccountName } = useAccountName();
  const { changeCurrentAccount } = useCurrentAccount();
  const [originName, setOriginName] = useState('');
  const [name, setName] = useState('');

  const account = useMemo(() => {
    return accounts.find((current) => current.id === accountId);
  }, [accounts]);

  const address = useMemo(() => {
    if (!account || !currentNetwork) {
      return '';
    }
    return account.getAddress(currentNetwork.addressPrefix);
  }, [account, currentNetwork]);

  const hasPrivateKey = useMemo(() => {
    if (!account) {
      return false;
    }
    return !isLedgerAccount(account);
  }, []);

  useEffect(() => {
    if (account?.id) {
      setOriginName(accountNames[account.id] || '');
      setName(accountNames[account.id] || '');
    }
  }, [account?.id]);

  const reset = useCallback(() => {
    setName(originName);
    if (account) {
      changeAccountName(account, originName);
    }
  }, [name, originName, account]);

  const moveGnoscan = useCallback(() => {
    window.open(`https://gnoscan.io/accounts/${address}`, '_blank');
  }, [address]);

  const moveExportPrivateKey = useCallback(async () => {
    if (account) {
      await changeCurrentAccount(account);
    }
    navigate(RoutePath.ExportPrivateKey, { state: { accountId } });
  }, [account]);

  const changeName = useCallback(
    async (text: string) => {
      if (!account) {
        return;
      }
      if (text.length <= ACCOUNT_NAME_LENGTH_LIMIT) {
        await setName(text);
        await changeAccountName(account, text);
      }
    },
    [account, setName],
  );

  return (
    <CommonFullContentLayout>
      <AccountDetails
        originName={originName}
        name={name}
        address={address}
        hasPrivateKey={hasPrivateKey}
        moveGnoscan={moveGnoscan}
        moveExportPrivateKey={moveExportPrivateKey}
        setName={changeName}
        reset={reset}
      />
    </CommonFullContentLayout>
  );
};

export default AccountDetailsContainer;
