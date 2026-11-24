import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConnectedAppsScreen } from '../../../../src/containers/main/connected-apps-screen';
import { StorageConnectedAppRepository } from '../../../../src/repositories/connected-app.repository';
import { ConnectedAppService } from '../../../../src/services/connected-app.service';
import { MemoryKeyValueStore } from '../../../../src/storage/memory-key-value-store';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ORIGIN = 'https://dapp.example.com';
const OTHER = 'https://other.example.com';

describe('ConnectedAppsScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lists an origin connected for several accounts once and disconnects all of them', async () => {
    const connectedAppService = new ConnectedAppService(new StorageConnectedAppRepository(new MemoryKeyValueStore()));
    const second = { ...ACCOUNT, id: 'acc-2', name: 'B' };
    let now = 1000;

    jest.spyOn(Date, 'now').mockImplementation(() => (now += 1));

    connectedAppService.touch(ORIGIN, { name: 'Example' }, ACCOUNT.id, NETWORK.id);
    connectedAppService.touch(ORIGIN, { name: 'Example' }, second.id, NETWORK.id);
    connectedAppService.touch(OTHER, { name: 'Other' }, ACCOUNT.id, NETWORK.id);
    const { Wrapper } = createWrapper({
      connectedAppService,
      accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT, second], getAddress: () => 'g1self' },
      networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
    });
    const Screen = ConnectedAppsScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Wrapper><Screen navigation={{ goBack: jest.fn() }} route={{ key: 'ConnectedApps', name: 'ConnectedApps' }} /></Wrapper>
      </SafeAreaProvider>,
    );

    expect(screen.getByText('2 connected apps')).toBeTruthy();
    expect(screen.getAllByText(ORIGIN)).toHaveLength(1);
    expect(screen.getByText('Testnet · B\nTestnet · A')).toBeTruthy();

    await fireEvent.press(screen.getAllByRole('button', { name: 'Disconnect' })[1]);

    expect(screen.getByText('1 connected apps')).toBeTruthy();
    expect(screen.queryByText(ORIGIN)).toBeNull();
    expect(connectedAppService.getConnectedApps().map(app => app.origin)).toEqual([OTHER]);
  });
});
