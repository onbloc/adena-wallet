import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SettingsScreen } from '../../../../src/containers/main/settings-screen';
import { AppError, AppErrorCode } from '../../../../src/core/errors';
import { NotificationPermission } from '../../../../src/domain/notification';
import { NOOP_NOTIFICATION_API } from '../../../../src/infrastructure/http/notification-api.client';
import { StorageNotificationSettingRepository } from '../../../../src/repositories/notification-setting.repository';
import { DEFAULT_PREFERENCES, StoragePreferenceRepository } from '../../../../src/repositories/preference.repository';
import { BiometryKind } from '../../../../src/security/secure-store';
import { AccountService } from '../../../../src/services/account.service';
import { NetworkService } from '../../../../src/services/network.service';
import { NotificationService, UNAVAILABLE_PUSH_MESSAGING } from '../../../../src/services/notification.service';
import { PreferenceService } from '../../../../src/services/preference.service';
import { MemoryKeyValueStore } from '../../../../src/storage/memory-key-value-store';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

// A device with biometrics available, so a biometric row would be offered if Settings had one.
const createWalletService = () => {
  let enabled = false;

  return {
    lock: jest.fn(),
    getBiometryKind: jest.fn(async () => BiometryKind.FACE),
    isBiometricUnlockEnabled: jest.fn(async () => enabled),
    enableBiometricUnlock: jest.fn(async (password: string) => {
      if (password !== 'secret') {
        throw new AppError(AppErrorCode.INVALID_PASSWORD, 'Invalid password');
      }

      enabled = true;
    }),
    disableBiometricUnlock: jest.fn(async () => {
      enabled = false;
    }),
  };
};

const setup = async (walletService: Record<string, unknown> = { lock: jest.fn() }, services: Record<string, unknown> = {}) => {
  const store = new MemoryKeyValueStore();
  const preferenceService = new PreferenceService(new StoragePreferenceRepository(store));
  const { Wrapper } = createWrapper({
    cloudBackupService: { isAvailable: async () => false, getLocalStatus: () => null, provider: 'icloud' },
    accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT], getAddress: () => ADDRESS },
    networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
    connectedAppService: { getConnectedApps: () => [] },
    walletService,
    preferenceService,
    ...services,
  });
  const navigation = { goBack: jest.fn(), navigate: jest.fn(), addListener: jest.fn(() => jest.fn()) };
  const Screen = SettingsScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={navigation} route={{ key: 'Settings', name: 'Settings' }} /></Wrapper>
    </SafeAreaProvider>,
  );

  return { navigation, preferenceService, store };
};

describe('SettingsScreen', () => {
  it('opens account settings from the header and the shared Connected apps screen', async () => {
    const { navigation } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'A, g1jg8m...fvsqf5' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Networks, Testnet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Connected apps, 0' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Address book' }));

    expect(navigation.navigate.mock.calls).toEqual([
      ['AccountSettings', { accountId: ACCOUNT.id }],
      ['Networks'],
      ['ConnectedApps'],
      ['AddressBook'],
    ]);
  });

  it('persists the theme picked in the sheet and shows it on the row', async () => {
    const { preferenceService, store } = await setup();

    expect(screen.getByRole('button', { name: 'Theme, Auto' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Theme, Auto' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Dark, Always use dark theme.' }));

    expect(preferenceService.get().theme).toBe('dark');
    expect(new StoragePreferenceRepository(store).get().theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Theme, Dark' })).toBeTruthy();
  });

  it('persists currency and language picks', async () => {
    const { preferenceService } = await setup();
    const update = jest.spyOn(preferenceService, 'update');

    await fireEvent.press(screen.getByRole('button', { name: 'Local currency, USD' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'United States Dollar, USD' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Language, English' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));

    expect(update.mock.calls).toEqual([[{ currency: 'USD' }], [{ language: 'en' }]]);
    expect(preferenceService.get()).toEqual(expect.objectContaining({ currency: 'USD', language: 'en' }));
  });

  it('persists the balance filters and haptics', async () => {
    const { preferenceService } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'Balances and activity' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Hide small balances' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Hide unknown tokens' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Haptic touch' }));

    expect(preferenceService.get()).toEqual({ ...DEFAULT_PREFERENCES, hideSmallBalances: false, hideUnknownTokens: false, hapticsEnabled: false });
    expect(screen.getByRole('switch', { name: 'Hide small balances' }).props.accessibilityState).toEqual(expect.objectContaining({ checked: false }));
  });

  it('leaves biometric unlock to the Change password screen', async () => {
    await setup(createWalletService());

    expect(await screen.findByRole('button', { name: 'Change password' })).toBeTruthy();
    expect(screen.queryByRole('switch', { name: 'Unlock with Face ID' })).toBeNull();
  });

  describe('notifications', () => {
    const createNotificationService = (granted: boolean) => new NotificationService(
      new StorageNotificationSettingRepository(new MemoryKeyValueStore()),
      {
        ...UNAVAILABLE_PUSH_MESSAGING,
        getPermission: async () => (granted ? NotificationPermission.GRANTED : NotificationPermission.DENIED),
        requestPermission: async () => (granted ? NotificationPermission.GRANTED : NotificationPermission.DENIED),
        getToken: async () => 'token',
      },
      NOOP_NOTIFICATION_API,
      { getAccounts: () => [ACCOUNT], getAddress: () => ADDRESS } as unknown as AccountService,
      { getCurrentNetwork: () => NETWORK } as unknown as NetworkService,
    );

    it('turns notifications on and filters a category', async () => {
      const notificationService = createNotificationService(true);

      await setup(undefined, { notificationService });
      await fireEvent.press(screen.getByRole('button', { name: 'Notifications, Off' }));
      await fireEvent.press(screen.getByRole('switch', { name: 'Allow notifications' }));
      await waitFor(() => expect(notificationService.getSettings().enabled).toBe(true));
      await fireEvent.press(screen.getByRole('switch', { name: 'Sent' }));

      await waitFor(() => expect(notificationService.getSettings().topics).toEqual({ received: true, sent: false, swap: true }));
      expect(screen.getByRole('button', { name: 'Notifications, On' })).toBeTruthy();
    });

    it('keeps notifications off and points to the system settings when the OS refuses', async () => {
      const notificationService = createNotificationService(false);

      await setup(undefined, { notificationService });
      await fireEvent.press(screen.getByRole('button', { name: 'Notifications, Off' }));
      await fireEvent.press(screen.getByRole('switch', { name: 'Allow notifications' }));

      expect(await screen.findByText('Notifications are turned off for Adena')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Open settings' })).toBeTruthy();
      expect(notificationService.getSettings().enabled).toBe(false);
    });

    it('explains when this build has no push provider', async () => {
      await setup();
      await fireEvent.press(screen.getByRole('button', { name: 'Notifications, Off' }));

      expect(await screen.findByText('Notifications are unavailable')).toBeTruthy();
    });
  });
});
