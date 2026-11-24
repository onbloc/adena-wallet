import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SettingsScreen } from '../../../../src/containers/main/settings-screen';
import { DEFAULT_PREFERENCES, StoragePreferenceRepository } from '../../../../src/repositories/preference.repository';
import { PreferenceService } from '../../../../src/services/preference.service';
import { MemoryKeyValueStore } from '../../../../src/storage/memory-key-value-store';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const setup = async () => {
  const store = new MemoryKeyValueStore();
  const preferenceService = new PreferenceService(new StoragePreferenceRepository(store));
  const { Wrapper } = createWrapper({
    accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT], getAddress: () => ADDRESS },
    networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
    connectedAppService: { getConnectedApps: () => [] },
    walletService: { lock: jest.fn() },
    preferenceService,
  });
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
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
});
