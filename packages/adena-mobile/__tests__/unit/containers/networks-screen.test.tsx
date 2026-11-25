import { fireEvent, screen } from '@testing-library/react-native';

import { NetworksScreen } from '../../../src/containers/main/networks-screen';
import { useSessionStore } from '../../../src/stores/session.store';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';

describe('NetworksScreen', () => {
  beforeEach(resetStores);

  it('selects a built-in network and opens the add form', async () => {
    const { env } = await setupWallet();
    const { navigation } = await renderScreen(NetworksScreen, { env });

    expect(screen.getByText('Onyx')).toBeTruthy();
    await fireEvent.press(screen.getByText('Onyx'));

    expect(env.container.networkService.getCurrentNetwork().id).toBe('onyx-1');
    expect(useSessionStore.getState().revision).toBe(1);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Add custom network' }));
    expect(navigation.navigate).toHaveBeenCalledWith('AddNetwork');

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalledTimes(2);
  });

  it('removes the selected custom network', async () => {
    const { env } = await setupWallet();
    const custom = await env.container.networkService.addCustomNetwork({ networkName: 'My node', rpcUrl: 'https://my.node', baseNetworkId: 'gnoland-1' });

    env.container.networkService.selectNetwork(custom.id);
    const { navigation } = await renderScreen(NetworksScreen, { env });

    await fireEvent.press(screen.getByText('My node'));

    expect(env.container.networkService.getNetworks().some(network => network.id === custom.id)).toBe(false);
    expect(env.container.networkService.getCurrentNetwork().id).toBe('gnoland-1');
    expect(screen.queryByText('My node')).toBeNull();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
