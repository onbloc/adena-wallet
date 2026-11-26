import { fromBase64, toBase64 } from '@cosmjs/encoding';
import { SessionAccountInfo } from '@gnolang/gno-js-client';
import { Tx } from '@gnolang/tm2-js-client';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CardsScreen } from '../../../../src/containers/main/cards-screen';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../../helpers/render-screen';
import { createTestContainer } from '../../../helpers/test-container';

const SESSION_KEY = toBase64(Uint8Array.from([0x02, ...new Array(32).fill(5)]));

const setup = async (count: number) => {
  const env = createTestContainer();
  const wallet = await setupWallet(env);
  const now = Math.floor(Date.now() / 1000);
  const session = (index: number): SessionAccountInfo => ({
    address: `g1card${index}`,
    master_address: wallet.address,
    public_key: { '@type': '/tm.PubKeySecp256k1', value: SESSION_KEY },
    expires_at: now + 3 * 86400 + 60,
    spend_limit: '2000000ugnot',
    spend_used: '500000ugnot',
    spend_period: 0,
    spend_reset: now - 10,
    allow_paths: ['vm/exec:gno.land/r/demo/x'],
  });

  env.gno.state.balances[wallet.address] = '100000000ugnot';
  env.gno.state.sessions[wallet.address] = Array.from({ length: count }, (_, index) => session(index));

  return { ...wallet, ...(await renderScreen(CardsScreen, { env })) };
};

describe('CardsScreen', () => {
  beforeEach(resetStores);

  it('explains what can work for you when nothing does', async () => {
    await setup(0);
    expect(await screen.findByText('Nothing is working for you yet')).toBeTruthy();
  });

  it('shows each card with what it spent and opens it', async () => {
    const { navigation } = await setup(1);

    expect(await screen.findByText('gno.land/r/demo/x')).toBeTruthy();
    expect(screen.getByText('0.5')).toBeTruthy();
    expect(screen.getByText('/ 2 GNOT')).toBeTruthy();
    expect(screen.getByText('3 days')).toBeTruthy();
    expect(screen.queryByTestId('cards-revoke-all')).toBeNull();

    await fireEvent.press(screen.getByTestId('card-row-g1card0'));
    expect(navigation.navigate).toHaveBeenCalledWith('CardDetail', { sessionAddress: 'g1card0' });
  });

  it('revokes a card from its tile after a hold', async () => {
    const { env } = await setup(1);

    await fireEvent.press(await screen.findByTestId('card-revoke-g1card0'));
    expect(await screen.findByText('Hold to revoke')).toBeTruthy();
    await fireEvent(screen.getByTestId('review-confirm'), 'longPress');

    await waitFor(() => expect(env.gno.state.broadcasts).toHaveLength(1));
    expect(Tx.decode(fromBase64(env.gno.state.broadcasts[0])).messages[0].type_url).toBe('/auth.m_revoke_session');
    await waitFor(() => expect(toastMessage()).toBe('Card revoked'));
  });

  it('offers revoke all once there are several cards', async () => {
    const { env } = await setup(2);

    await fireEvent.press(await screen.findByTestId('cards-revoke-all'));
    expect(await screen.findByText('Hold to revoke all')).toBeTruthy();
    await fireEvent(screen.getByTestId('review-confirm'), 'longPress');

    await waitFor(() => expect(env.gno.state.broadcasts).toHaveLength(1));
    expect(Tx.decode(fromBase64(env.gno.state.broadcasts[0])).messages[0].type_url).toBe('/auth.m_revoke_all_sessions');
  });
});
