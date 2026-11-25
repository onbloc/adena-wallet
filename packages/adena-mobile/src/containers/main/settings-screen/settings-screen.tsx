import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useCallback } from 'react';

import packageJson from '../../../../package.json';
import { SettingsBiometricView, SettingsOptionView, SettingsPage } from '../../../components/pages';
import { KeyringType } from '../../../crypto/keyring';
import { useContainer } from '../../../di/container-provider';
import {
  isCurrencyCode,
  isLanguageCode,
  isThemePreference,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  THEME_OPTIONS,
} from '../../../domain/preferences';
import { usePasswordGate } from '../../../hooks/use-password-gate';
import { usePreference } from '../../../hooks/use-preference';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { toAvatarColor } from '../../../presenters/account.presenter';
import { queryKeys } from '../../../queries/query-keys';
import { useBiometricStatusQuery } from '../../../queries/wallet.queries';
import { SessionStatus, useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';
import { getBiometryLabel } from '../../../utils/biometry';

const THEME_VIEWS: SettingsOptionView[] = THEME_OPTIONS.map(option => ({
  value: option.value,
  title: option.name,
  description: option.description,
}));

const CURRENCY_VIEWS: SettingsOptionView[] = SUPPORTED_CURRENCIES.map(option => ({ value: option.code, title: option.name, code: option.code }));

const LANGUAGE_VIEWS: SettingsOptionView[] = SUPPORTED_LANGUAGES.map(option => ({ value: option.code, title: option.name }));

export const SettingsScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'Settings'>): ReactElement => {
  const { walletService, preferenceService, connectedAppService, accountPhotoService } = useContainer();
  const { network, accounts, account, address } = useWalletSnapshot();
  const { setStatus } = useSessionStore();
  const queryClient = useQueryClient();

  const theme = usePreference('theme');
  const currency = usePreference('currency');
  const language = usePreference('language');
  const hideSmallBalances = usePreference('hideSmallBalances');
  const hideUnknownTokens = usePreference('hideUnknownTokens');
  const hapticsEnabled = usePreference('hapticsEnabled');
  const showToast = useToastStore(state => state.show);
  const biometricStatus = useBiometricStatusQuery();
  const biometricLabel = getBiometryLabel(biometricStatus.data?.kind ?? null);

  // Re-enabling only needs the current password, not a password change.
  const enableBiometrics = useCallback(async (password: string): Promise<void> => {
    try {
      await walletService.enableBiometricUnlock(password);
    }
    finally {
      await queryClient.invalidateQueries({ queryKey: queryKeys.biometric() });
    }
  }, [queryClient, walletService]);
  const biometricGate = usePasswordGate(enableBiometrics, { biometrics: false });

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

  const handleToggleBiometric = (value: boolean): void => {
    if (value) {
      biometricGate.open();
      return;
    }

    walletService.disableBiometricUnlock()
      .catch(() => showToast(`Couldn’t turn off ${biometricLabel ?? 'biometric'} unlock`, 'error'))
      .finally(() => queryClient.invalidateQueries({ queryKey: queryKeys.biometric() }));
  };

  const biometric: SettingsBiometricView | undefined = biometricLabel
    ? { label: biometricLabel, enabled: Boolean(biometricStatus.data?.enabled), onToggle: handleToggleBiometric, sheet: biometricGate.sheetProps }
    : undefined;

  const handleOpenReset = (): void => navigation.navigate('ResetWallet');

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
      appVersion={packageJson.version}
      onOpenNetworks={handleOpenNetworks}
      onOpenConnectedApps={handleOpenConnectedApps}
      onOpenRecoveryPhrase={handleOpenRecoveryPhrase}
      onOpenChangePassword={handleOpenChangePassword}
      biometric={biometric}
      onLock={handleLock}
      onOpenAddressBook={handleOpenAddressBook}
      onOpenReset={handleOpenReset}
      onBack={navigation.goBack}
    />
  );
};
