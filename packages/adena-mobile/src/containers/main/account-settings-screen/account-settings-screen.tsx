import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useCallback } from 'react';

import { AccountSettingsPage } from '../../../components/pages';
import { KeyringType } from '../../../crypto/keyring';
import { useContainer } from '../../../di/container-provider';
import { useCopyToClipboard } from '../../../hooks/use-copy-to-clipboard';
import { usePasswordGate } from '../../../hooks/use-password-gate';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { toAvatarColor } from '../../../presenters/account.presenter';
import { useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';

export const AccountSettingsScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'AccountSettings'>): ReactElement | null => {
  const { accountId } = route.params;
  const { accountService, walletService, connectedAppService } = useContainer();
  const { accounts, network } = useWalletSnapshot();
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const showToast = useToastStore(state => state.show);
  const copy = useCopyToClipboard();
  const account = accounts.find(item => item.id === accountId);

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

  const handleEditProfile = (): void => navigation.navigate('EditProfile', { accountId: account.id });

  const handleCopyAddress = (): void => copy(address);

  const handleOpenConnectedApps = (): void => navigation.navigate('ConnectedApps');

  const handleOpenRecoveryPhrase = (): void => navigation.navigate('RecoveryPhrase', { keyringId: account.keyringId });

  return (
    <AccountSettingsPage
      name={account.name}
      address={address}
      sourceLabel={account.keyringType === KeyringType.HD_WALLET ? `Recovery phrase · #${account.hdIndex + 1}` : 'Imported key'}
      avatarColor={toAvatarColor(account)}
      onEditProfile={handleEditProfile}
      connectedAppCount={new Set(connectedAppService.getConnectedApps().map(app => app.origin)).size}
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
