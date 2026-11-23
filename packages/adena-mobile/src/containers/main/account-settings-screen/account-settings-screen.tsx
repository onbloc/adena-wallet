import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useCallback, useState } from 'react';

import { AccountSettingsPage } from '../../../components/pages';
import { KeyringType } from '../../../crypto/keyring';
import { useContainer } from '../../../di/container-provider';
import { useCopyToClipboard } from '../../../hooks/use-copy-to-clipboard';
import { usePasswordGate } from '../../../hooks/use-password-gate';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';

export const AccountSettingsScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'AccountSettings'>): ReactElement | null => {
  const { accountId } = route.params;
  const { accountService, walletService } = useContainer();
  const { accounts, network } = useWalletSnapshot();
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const showToast = useToastStore(state => state.show);
  const copy = useCopyToClipboard();
  const account = accounts.find(item => item.id === accountId);
  const [editingName, setEditingName] = useState(account?.name ?? '');

  const removeAccount = useCallback(async (password: string) => {
    await walletService.removeAccount(accountId, password);
    bumpRevision();
    showToast('Account removed', 'success');
    navigation.popToTop();
  }, [accountId, bumpRevision, navigation, showToast, walletService]);
  const removeGate = usePasswordGate(removeAccount);

  if (!account) {
    return null;
  }

  const address = accountService.getAddress(account, network);

  const handleSaveName = (): void => {
    accountService.renameAccount(account.id, editingName);
    bumpRevision();
    showToast('Name updated', 'success');
  };

  const handleCopyAddress = (): void => copy(address);

  const handleOpenConnectedApps = (): void => navigation.navigate('ConnectedApps');

  const handleOpenRecoveryPhrase = (): void => navigation.navigate('RecoveryPhrase', { keyringId: account.keyringId });

  return (
    <AccountSettingsPage
      name={account.name}
      address={address}
      sourceLabel={account.keyringType === KeyringType.HD_WALLET ? `Recovery phrase · #${account.hdIndex + 1}` : 'Imported key'}
      editingName={editingName}
      onChangeEditingName={setEditingName}
      canSaveName={editingName.trim().length > 0 && editingName.trim() !== account.name}
      onSaveName={handleSaveName}
      hasRecoveryPhrase={account.keyringType === KeyringType.HD_WALLET}
      canRemove={accounts.length > 1}
      onCopyAddress={handleCopyAddress}
      onOpenConnectedApps={handleOpenConnectedApps}
      onOpenRecoveryPhrase={handleOpenRecoveryPhrase}
      onRequestRemove={removeGate.open}
      removeSheet={removeGate.sheetProps}
      onBack={navigation.goBack}
    />
  );
};
