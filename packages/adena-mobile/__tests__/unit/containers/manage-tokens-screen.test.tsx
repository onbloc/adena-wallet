import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ManageTokensScreen } from '../../../src/containers/main/manage-tokens-screen';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';
import { API_URL, RESOURCE_BASE } from '../../helpers/test-container';

const PERUN = 'gno.land/r/demo/defi/grc20factory.PERUN';

const withTokens = async () => {
  const wallet = await setupWallet();

  wallet.env.http
    .on(`${RESOURCE_BASE}/gno-native/gnoland-1.json`, [{ denom: 'ugnot', name: 'Gno.land', symbol: 'GNOT', decimals: 6 }])
    .on(`${RESOURCE_BASE}/grc20/gnoland-1.json`, [])
    .on(`${API_URL}/v1/accounts/${wallet.address}`, {
      data: { assets: [{ tokenType: 'GRC20', tokenId: PERUN, tokenKey: PERUN, packagePath: 'gno.land/r/demo/defi/grc20factory', name: 'Perun', symbol: 'PERUN', decimals: 6, amount: '5', logoUrl: null }] },
    });
  return wallet;
};

describe('ManageTokensScreen', () => {
  beforeEach(resetStores);

  it('filters tokens and toggles a non-native token', async () => {
    const { env, account, network } = await withTokens();
    const { navigation } = await renderScreen(ManageTokensScreen, { env });

    const perun = await screen.findByRole('switch', { name: 'Show PERUN' });

    expect(screen.getByRole('switch', { name: 'Show GNOT' })).toBeDisabled();
    await fireEvent.press(perun);
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Show PERUN' })).not.toBeChecked());
    expect((await env.container.tokenService.getTokenList(account, network)).find(token => token.id === PERUN)?.visible).toBe(false);

    await fireEvent.changeText(screen.getByLabelText('Search tokens'), 'per');
    expect(screen.queryByRole('switch', { name: 'Show GNOT' })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Search tokens'), 'gnot');
    expect(screen.getByRole('switch', { name: 'Show GNOT' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Add custom token' }));
    expect(navigation.navigate).toHaveBeenCalledWith('AddToken');
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('only offers custom tokens on Gno networks', async () => {
    const { env } = await setupWallet();

    env.container.networkService.selectNetwork('atomone-1');
    await renderScreen(ManageTokensScreen, { env });

    expect(screen.queryByRole('button', { name: 'Add custom token' })).toBeNull();
  });
});
