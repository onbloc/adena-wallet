import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useRef, useState } from 'react';

import { AccountsPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { KeyringType } from '../../../crypto/keyring';
import { useContainer } from '../../../di/container-provider';
import { SecretImportMode } from '../../../domain/account';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { toAvatarColor } from '../../../presenters/account.presenter';
import { useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';

const SOURCE_LABEL = { HD_WALLET: 'Recovery phrase', PRIVATE_KEY: 'Imported key' } as const;

export const AccountsScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'Accounts'>): ReactElement => {
  const { accountService, accountPhotoService } = useContainer();
  const { accounts, account: current, network } = useWalletSnapshot();
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const showToast = useToastStore(state => state.show);
  const [adding, setAdding] = useState(false);
  // State updates land after the next render, so a quick second tap would add a second account.
  const addingRef = useRef(false);

  // New accounts derive from the keyring of the selected HD account (or the first HD keyring).
  const addAccount = async (): Promise<void> => {
    const source = current?.keyringType === KeyringType.HD_WALLET ? current : accounts.find(item => item.keyringType === KeyringType.HD_WALLET);

    if (!source) {
      navigation.navigate('ImportAccount', { mode: SecretImportMode.MNEMONIC });
      return;
    }

    if (addingRef.current) {
      return;
    }

    addingRef.current = true;
    setAdding(true);

    try {
      const created = await accountService.createAccount(source.keyringId, KeyringType.HD_WALLET);

      accountService.selectAccount(created.id);
      bumpRevision();
      showToast(`${created.name} added`, 'success');
    }
    catch (error) {
      showToast(toErrorMessage(error), 'error');
    }
    finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  const handleSelect = (accountId: string): void => {
    accountService.selectAccount(accountId);
    bumpRevision();
    navigation.goBack();
  };

  const handleOpenAccountSettings = (accountId: string): void => navigation.navigate('AccountSettings', { accountId });

  const handleImportMnemonic = (): void => navigation.navigate('ImportAccount', { mode: SecretImportMode.MNEMONIC });

  const handleImportPrivateKey = (): void => navigation.navigate('ImportAccount', { mode: SecretImportMode.PRIVATE_KEY });

  return (
    <AccountsPage
      accounts={accounts.map(item => ({
        id: item.id,
        name: item.name,
        address: accountService.getAddress(item, network),
        sourceLabel: SOURCE_LABEL[item.keyringType],
        selected: item.id === current?.id,
        avatarColor: toAvatarColor(item),
        avatarPhoto: accountPhotoService.get(item.id),
      }))}
      adding={adding}
      onSelect={handleSelect}
      onOpenAccountSettings={handleOpenAccountSettings}
      onAddAccount={addAccount}
      onImportMnemonic={handleImportMnemonic}
      onImportPrivateKey={handleImportPrivateKey}
      onBack={navigation.goBack}
    />
  );
};
