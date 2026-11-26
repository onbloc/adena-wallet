import { fromBase64 } from '@cosmjs/encoding';
import { Tx } from '@gnolang/tm2-js-client';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CardsScreen } from '../../../../src/containers/main/cards-screen';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../../helpers/render-screen';
import { createTestContainer } from '../../../helpers/test-container';

const setup = async (withCards: boolean) => {
  const env = createTestContainer();
  const wallet = await setupWallet(env);
  const now = Math.floor(Date.now() / 1000);

  env.gno.state.balances[wallet.address] = '100000000ugnot';
  env.gno.state.sessions[wallet.address] = withCards
    ? [{
        address: 'g1elsewherecard',
        master_address: wallet.address,
        public_key: null,
        expires_at: now + 3 * 86400 + 60,
        spend_limit: '2000000ugnot',
        spend_used: '500000ugnot',
        spend_period: 0,
        spend_reset: now - 10,
        allow_paths: ['vm/exec:gno.land/r/demo/x'],
      }]
    : [];

  return { ...wallet, ...(await renderScreen(CardsScreen, { env })) };
};

describe('CardsScreen', () => {
  beforeEach(resetStores);

  it('explains cards when there are none', async () => {
    await setup(false);
    expect(await screen.findByText('No cards yet')).toBeTruthy();
  });

  it('lists cards from the chain and opens one', async () => {
    const { navigation } = await setup(true);

    expect(await screen.findByText('gno.land/r/demo/x')).toBeTruthy();
    expect(screen.getByText('0.5 GNOT')).toBeTruthy();
    expect(screen.getByText('3 days left')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('card-row-g1elsewherecard'));
    expect(navigation.navigate).toHaveBeenCalledWith('CardDetail', { sessionAddress: 'g1elsewherecard' });
  });

  it('revokes every card after a hold', async () => {
    const { env } = await setup(true);

    await fireEvent.press(await screen.findByTestId('cards-revoke-all'));
    expect(await screen.findByText('Hold to revoke all')).toBeTruthy();
    expect(screen.getByText('This cannot be undone')).toBeTruthy();
    await fireEvent(screen.getByTestId('review-confirm'), 'longPress');

    await waitFor(() => expect(env.gno.state.broadcasts).toHaveLength(1));
    expect(Tx.decode(fromBase64(env.gno.state.broadcasts[0])).messages[0].type_url).toBe('/auth.m_revoke_all_sessions');
    await waitFor(() => expect(toastMessage()).toBe('All cards revoked'));
  });
});
