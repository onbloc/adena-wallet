import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useEffect, useReducer, useState } from 'react';
import { Linking } from 'react-native';

import packageJson from '../../../../package.json';
import { SettingsNotificationsView, SettingsOptionView, SettingsPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { KeyringType } from '../../../crypto/keyring';
import { useContainer } from '../../../di/container-provider';
import { isNotificationTopic, NOTIFICATION_TOPIC_OPTIONS, NotificationPermission } from '../../../domain/notification';
import {
  isCurrencyCode,
  isLanguageCode,
  isThemePreference,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  THEME_OPTIONS,
} from '../../../domain/preferences';
import { useNotificationSettings } from '../../../hooks/use-notification-settings';
import { usePreference } from '../../../hooks/use-preference';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { toAvatarColor } from '../../../presenters/account.presenter';
import { cloudProviderName } from '../../../presenters/cloud-backup.presenter';
import { useCloudBackupAvailableQuery } from '../../../queries/cloud-backup.queries';
import { SessionStatus, useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';

const THEME_VIEWS: SettingsOptionView[] = THEME_OPTIONS.map(option => ({
  value: option.value,
  title: option.name,
  description: option.description,
}));

const CURRENCY_VIEWS: SettingsOptionView[] = SUPPORTED_CURRENCIES.map(option => ({ value: option.code, title: option.name, code: option.code }));

const LANGUAGE_VIEWS: SettingsOptionView[] = SUPPORTED_LANGUAGES.map(option => ({ value: option.code, title: option.name }));

export const SettingsScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'Settings'>): ReactElement => {
  const { walletService, preferenceService, connectedAppService, accountPhotoService, cloudBackupService, notificationService } = useContainer();
  const { data: cloudBackupAvailable } = useCloudBackupAvailableQuery();
  // Re-render on focus so returning from account changes shows an outdated backup.
  const [, refreshOnFocus] = useReducer((count: number) => count + 1, 0);

  useEffect(() => navigation.addListener('focus', refreshOnFocus), [navigation]);
  const backupStatus = cloudBackupService.getLocalStatus();
  const { network, accounts, account, address } = useWalletSnapshot();
  const { setStatus } = useSessionStore();
  const queryClient = useQueryClient();

  const theme = usePreference('theme');
  const currency = usePreference('currency');
  const language = usePreference('language');
  const hideSmallBalances = usePreference('hideSmallBalances');
  const hideUnknownTokens = usePreference('hideUnknownTokens');
  const hapticsEnabled = usePreference('hapticsEnabled');
  const { settings: notificationSettings, permission, refreshPermission } = useNotificationSettings();
  // Set once the OS refused a request, so a not-yet-asked Android 13 device is not told to open settings.
  const [permissionRefused, setPermissionRefused] = useState(false);

  const recoveryKeyringId = account?.keyringType === KeyringType.HD_WALLET
    ? account.keyringId
    : accounts.find(item => item.keyringType === KeyringType.HD_WALLET)?.keyringId;

  // Counted per origin, matching the Connected apps list.
  const connectedAppCount = new Set(connectedAppService.getConnectedApps().map(app => app.origin)).size;

  const handleSelectTheme = (value: string): void => {
    if (isThemePreference(value)) {
      preferenceService.update({ theme: value });
    }
  };

  const handleSelectCurrency = (value: string): void => {
    if (isCurrencyCode(value)) {
      preferenceService.update({ currency: value });
    }
  };

  const handleSelectLanguage = (value: string): void => {
    if (isLanguageCode(value)) {
      preferenceService.update({ language: value });
    }
  };

  const handleToggleHideSmallBalances = (value: boolean): void => void preferenceService.update({ hideSmallBalances: value });

  const handleToggleHideUnknownTokens = (value: boolean): void => void preferenceService.update({ hideUnknownTokens: value });

  const handleToggleHaptics = (value: boolean): void => void preferenceService.update({ hapticsEnabled: value });

  // The server keeps the last registration until the next sync succeeds; the change itself is saved locally.
  const reportSyncError = (error: unknown): void => useToastStore.getState().show(`Notifications not updated: ${toErrorMessage(error)}`, 'error');

  const handleToggleNotifications = (value: boolean): void => {
    notificationService.setEnabled(value)
      .then(result => setPermissionRefused(value && result !== NotificationPermission.GRANTED), reportSyncError)
      .finally(refreshPermission);
  };

  const handleToggleNotificationTopic = (topic: string, value: boolean): void => {
    if (isNotificationTopic(topic)) {
      notificationService.setTopic(topic, value).catch(reportSyncError);
    }
  };

  const permissionDenied = permission === NotificationPermission.DENIED && (permissionRefused || notificationSettings.enabled);
  const notifications: SettingsNotificationsView = {
    // The saved choice, so it can still be turned off while the OS blocks delivery (the alert explains that).
    enabled: notificationSettings.enabled,
    topics: NOTIFICATION_TOPIC_OPTIONS.map(option => ({
      topic: option.topic,
      title: option.name,
      description: option.description,
      value: notificationSettings.topics[option.topic],
    })),
    alert: permission === NotificationPermission.UNAVAILABLE
      ? { title: 'Notifications are unavailable', description: 'This build is not set up for push notifications.' }
      : permissionDenied
        ? { title: 'Notifications are turned off for Adena', description: 'Allow them in your device settings to get alerts.' }
        : undefined,
    onOpenSystemSettings: permissionDenied ? (): void => void Linking.openSettings() : undefined,
    onToggleEnabled: handleToggleNotifications,
    onToggleTopic: handleToggleNotificationTopic,
  };

  const handleOpenAccount = (): void => {
    if (account) {
      navigation.navigate('AccountSettings', { accountId: account.id });
    }
  };

  const handleOpenNetworks = (): void => navigation.navigate('Networks');

  // Same destination as Account settings > Manage connections.
  const handleOpenConnectedApps = (): void => navigation.navigate('ConnectedApps');

  const handleOpenRecoveryPhrase = (): void | '' | undefined => recoveryKeyringId && navigation.navigate('RecoveryPhrase', { keyringId: recoveryKeyringId });

  const handleOpenChangePassword = (): void => navigation.navigate('ChangePassword');

  const handleLock = (): void => {
    walletService.lock();
    queryClient.clear();
    setStatus(SessionStatus.LOCKED);
  };

  const handleOpenAddressBook = (): void => navigation.navigate('AddressBook');

  const handleOpenReset = (): void => navigation.navigate('ResetWallet');

  const handleOpenCloudBackup = (): void => navigation.navigate('CloudBackup');

  return (
    <SettingsPage
      account={account
        ? { name: account.name, address, avatarColor: toAvatarColor(account), avatarPhoto: accountPhotoService.get(account.id) }
        : undefined}
      onOpenAccount={handleOpenAccount}
      networkName={network.networkName}
      connectedAppCount={connectedAppCount}
      themeOptions={THEME_VIEWS}
      theme={theme}
      onSelectTheme={handleSelectTheme}
      currencyOptions={CURRENCY_VIEWS}
      currency={currency}
      onSelectCurrency={handleSelectCurrency}
      languageOptions={LANGUAGE_VIEWS}
      language={language}
      onSelectLanguage={handleSelectLanguage}
      hideSmallBalances={hideSmallBalances}
      onToggleHideSmallBalances={handleToggleHideSmallBalances}
      hideUnknownTokens={hideUnknownTokens}
      onToggleHideUnknownTokens={handleToggleHideUnknownTokens}
      hapticsEnabled={hapticsEnabled}
      onToggleHaptics={handleToggleHaptics}
      notifications={notifications}
      appVersion={packageJson.version}
      onOpenNetworks={handleOpenNetworks}
      onOpenConnectedApps={handleOpenConnectedApps}
      onOpenRecoveryPhrase={handleOpenRecoveryPhrase}
      onOpenChangePassword={handleOpenChangePassword}
      onLock={handleLock}
      onOpenAddressBook={handleOpenAddressBook}
      onOpenReset={handleOpenReset}
      cloudBackupLabel={cloudBackupAvailable ? `${cloudProviderName(cloudBackupService.provider)} backup` : undefined}
      cloudBackupValue={backupStatus?.kind === 'backedUp' ? (backupStatus.uploading ? 'Uploading' : backupStatus.outdated ? 'Out of date' : undefined) : undefined}
      onOpenCloudBackup={handleOpenCloudBackup}
      onBack={navigation.goBack}
    />
  );
};
