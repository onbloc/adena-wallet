import { fireEvent, screen } from '@testing-library/react-native';

import { ConnectedAppsScreen } from '../../../src/containers/main/connected-apps-screen';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';

describe('ConnectedAppsScreen', () => {
  beforeEach(resetStores);

  it('lists apps with their network and account and disconnects them', async () => {
    const { env, account, network } = await setupWallet();

    env.container.connectedAppService.touch('https://swap.example', { name: 'Swap' }, account.id, network.id);
    env.container.connectedAppService.touch('https://old.example', { name: 'Old' }, 'gone-account', 'gone-network');
    const { navigation } = await renderScreen(ConnectedAppsScreen, { env });

    expect(screen.getByText('2 connected apps')).toBeTruthy();
    expect(screen.getByText(`${network.networkName} · ${account.name}`)).toBeTruthy();
    expect(screen.getByText('gone-network · Removed account')).toBeTruthy();

    await fireEvent.press(screen.getAllByRole('button', { name: 'Disconnect' })[0]);

    expect(screen.getByText('1 connected app')).toBeTruthy();
    expect(env.container.connectedAppService.getConnectedApps()).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
