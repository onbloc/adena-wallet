import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { hasPrivateKeyAccount } from 'adena-module';

import AccountDetails from '@components/pages/account-details/account-details';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import { useNetwork } from '@hooks/use-network';
import { useAccountName } from '@hooks/use-account-name';
import { RoutePath } from '@types';
import { useCurrentAccount } from '@hooks/use-current-account';
import { CommonFullContentLayout } from '@components/atoms';
import useLink from '@hooks/use-link';
import { AdenaStorage } from '@common/storage';
import { WALLET_EXPORT_TYPE_STORAGE_KEY } from '@common/constants/storage.constant';

const ACCOUNT_NAME_LENGTH_LIMIT = 23;

const AccountDetailsContainer: React.FC = () => {
  const { openLink } = useLink();
  const { accountId } = useParams();
  const { accounts } = useLoadAccounts();
  const { currentNetwork } = useNetwork();
  const { accountNames, changeAccountName } = useAccountName();
  const { changeCurrentAccount } = useCurrentAccount();
  const [originName, setOriginName] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState<string>('');

  const account = useMemo(() => {
    return accounts.find((current) => current.id === accountId);
  }, [accounts]);

  const hasPrivateKey = useMemo(() => {
    if (!account) {
      return false;
    }
    return hasPrivateKeyAccount(account);
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
    openLink(`https://gnoscan.io/accounts/${address}`);
  }, [address]);

  const moveExportPrivateKey = useCallback(async () => {
    if (account) {
      await changeCurrentAccount(account);
    }
    const sessionStorage = AdenaStorage.session();
    await sessionStorage.set(WALLET_EXPORT_TYPE_STORAGE_KEY, 'PRIVATE_KEY');
    openLink('/register.html#' + RoutePath.WebWalletExport);
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

  useEffect(() => {
    if (!currentNetwork || !account) {
      setAddress('');
      return;
    }
    account.getAddress(currentNetwork.addressPrefix).then(setAddress);
  }, [currentNetwork, account]);

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
