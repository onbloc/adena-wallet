import { hasPrivateKeyAccount, isSeedAccount } from 'adena-module';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { SCANNER_URL } from '@common/constants/resource.constant';
import {
  WALLET_EXPORT_ACCOUNT_ID,
  WALLET_EXPORT_TYPE_STORAGE_KEY,
} from '@common/constants/storage.constant';
import { AdenaStorage } from '@common/storage';
import { makeQueryString } from '@common/utils/string-utils';
import { CommonFullContentLayout } from '@components/atoms';
import AccountDetails from '@components/pages/account-details/account-details';
import { useAccountName } from '@hooks/use-account-name';
import useLink from '@hooks/use-link';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import { useNetwork } from '@hooks/use-network';

const ACCOUNT_NAME_LENGTH_LIMIT = 23;

const AccountDetailsContainer: React.FC = () => {
  const { openLink, openSecurity } = useLink();
  const { accountId } = useParams();
  const { accounts } = useLoadAccounts();
  const { currentNetwork, scannerParameters } = useNetwork();
  const { accountNames, changeAccountName } = useAccountName();
  const [originName, setOriginName] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState<string>('');

  const account = useMemo(() => {
    return accounts.find((current) => current.id === accountId);
  }, [accounts]);

  const hasSeedPhrase = useMemo(() => {
    if (!account) {
      return false;
    }
    return isSeedAccount(account);
  }, []);

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
    const scannerUrl = currentNetwork.linkUrl || SCANNER_URL;
    const openLinkUrl = scannerParameters
      ? `${scannerUrl}/account/${address}?${makeQueryString(scannerParameters)}`
      : `${scannerUrl}/account/${address}`;
    openLink(openLinkUrl);
  }, [address]);

  const moveRevealSeedPhrase = useCallback(async () => {
    const sessionStorage = AdenaStorage.session();
    await sessionStorage.set(WALLET_EXPORT_TYPE_STORAGE_KEY, 'SEED_PHRASE');
    await sessionStorage.set(WALLET_EXPORT_ACCOUNT_ID, accountId || '');
    openSecurity();
  }, [account]);

  const moveExportPrivateKey = useCallback(async () => {
    const sessionStorage = AdenaStorage.session();
    await sessionStorage.set(WALLET_EXPORT_TYPE_STORAGE_KEY, 'PRIVATE_KEY');
    await sessionStorage.set(WALLET_EXPORT_ACCOUNT_ID, accountId || '');
    openSecurity();
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
        hasSeedPhrase={hasSeedPhrase}
        moveGnoscan={moveGnoscan}
        moveRevealSeedPhrase={moveRevealSeedPhrase}
        moveExportPrivateKey={moveExportPrivateKey}
        setName={changeName}
        reset={reset}
      />
    </CommonFullContentLayout>
  );
};

export default AccountDetailsContainer;
