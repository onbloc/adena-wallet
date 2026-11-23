import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AddNetworkScreen } from '../../../src/containers/main/add-network-screen';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';

const fill = async (name: string, url: string, label = 'RPC URL'): Promise<void> => {
  await fireEvent.changeText(screen.getByLabelText('Network name'), name);
  await fireEvent.changeText(screen.getByLabelText(label), url);
};

describe('AddNetworkScreen', () => {
  beforeEach(resetStores);

  it('rejects URLs without a scheme and clears the error on edit', async () => {
    const { env } = await setupWallet();

    await renderScreen(AddNetworkScreen, { env });
    await fill('My node', 'my.node');
    await fireEvent.press(screen.getByRole('button', { name: 'Add network' }));

    expect(await screen.findByText('URL must start with http:// or https://')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('RPC URL'), 'https://my.node');
    expect(screen.queryByText('URL must start with http:// or https://')).toBeNull();
  });

  it('adds and selects the network, then refuses a duplicate', async () => {
    const { env } = await setupWallet();
    const { navigation } = await renderScreen(AddNetworkScreen, { env });

    await fill('My node', 'https://my.node/');
    await fireEvent.press(screen.getByRole('button', { name: 'Add network' }));

    await waitFor(() => expect(navigation.pop).toHaveBeenCalledWith(2));
    expect(env.container.networkService.getCurrentNetwork()).toMatchObject({ networkName: 'My node', chainId: 'gnoland-1', isCustom: true });

    await fireEvent.press(screen.getByRole('button', { name: 'Add network' }));
    expect(await screen.findByText('This network is already added')).toBeTruthy();
    expect(navigation.pop).toHaveBeenCalledTimes(1);
  });

  it('cycles through base networks and labels Cosmos endpoints as REST', async () => {
    const { env } = await setupWallet();
    const bases = env.container.networkService.getNetworks().filter(network => !network.isCustom);
    const { navigation } = await renderScreen(AddNetworkScreen, { env });

    expect(screen.getByText(`${bases[0].chainName} (${bases[0].networkName})`)).toBeTruthy();

    for (const base of [...bases.slice(1), bases[0]]) {
      await fireEvent.press(screen.getByText(/\(.+\)$/));
      expect(screen.getByText(`${base.chainName} (${base.networkName})`)).toBeTruthy();

      if (base.family === 'cosmos') {
        expect(screen.getByLabelText('REST (LCD) URL')).toBeTruthy();
      }
    }

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
