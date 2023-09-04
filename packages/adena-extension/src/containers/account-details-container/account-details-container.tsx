import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AccountDetails from '@components/account-details/account-details/account-details';
import { useNavigate, useParams } from 'react-router-dom';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import { useNetwork } from '@hooks/use-network';
import { useAccountName } from '@hooks/use-account-name';
import { RoutePath } from '@router/path';

const ACCOUNT_NAME_LENGTH_LIMIT = 23;

const AccountDetailsContainer: React.FC = () => {
  const { accountId } = useParams();
  const naviage = useNavigate();
  const { accounts } = useLoadAccounts();
  const { currentNetwork } = useNetwork();
  const { accountNames, changeAccountName } = useAccountName();
  const [originName, setOriginName] = useState('');
  const [name, setName] = useState('');

  const account = useMemo(() => {
    return accounts.find(current => current.id === accountId);
  }, [accounts]);

  const address = useMemo(() => {
    if (!account || !currentNetwork) {
      return '';
    }
    return account.getAddress(currentNetwork.addressPrefix);
  }, [account, currentNetwork]);

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

  const moveExportPrivateKey = useCallback(() => {
    naviage(RoutePath.ApproachPasswordPhrase, { state: { accountId } });
  }, [account]);

  const changeName = useCallback(async (text: string) => {
    if (!account) {
      return;
    }
    if (text.length <= ACCOUNT_NAME_LENGTH_LIMIT) {
      await setName(text);
      await changeAccountName(account, text);
    }
  }, [account, setName]);

  return (
    <AccountDetails
      originName={originName}
      name={name}
      address={address}
      moveGnoscan={moveGnoscan}
      moveExportPrivateKey={moveExportPrivateKey}
      setName={changeName}
      reset={reset}
    />
  );
};

export default AccountDetailsContainer;