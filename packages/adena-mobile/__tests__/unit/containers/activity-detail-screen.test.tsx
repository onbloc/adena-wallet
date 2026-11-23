import Clipboard from '@react-native-clipboard/clipboard';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { ActivityDetailScreen } from '../../../src/containers/main/activity-detail-screen';
import { Activity } from '../../../src/domain/activity';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../helpers/render-screen';

jest.setTimeout(20_000);

const HASH = 'ab'.repeat(32);
const full: Activity = {
  hash: HASH,
  height: 42,
  type: 'TRANSFER',
  typeName: 'Transfer',
  title: 'Receive',
  status: 'SUCCESS',
  direction: 'in',
  amount: { value: '1500000', denom: 'ugnot' },
  networkFee: { value: '1000', denom: 'ugnot' },
  extraInfo: '+2',
  from: 'g1from',
  to: 'g1to',
  timestamp: '2026-11-20T10:00:00Z',
};

const settle = (): Promise<void> => act(async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
});

describe('ActivityDetailScreen', () => {
  beforeEach(() => {
    resetStores();
    jest.restoreAllMocks();
  });

  it('shows every row, copies the hash and opens Gnoscan', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { env } = await setupWallet();

    jest.spyOn(env.container.tokenService, 'getTokenList').mockResolvedValue([]);
    const { navigation } = await renderScreen(ActivityDetailScreen, { env, params: { activity: full } });

    expect(screen.getByText('Receive +2')).toBeTruthy();
    expect(screen.getByText('Transfer')).toBeTruthy();
    expect(screen.getByText('g1from')).toBeTruthy();
    expect(screen.getByText('g1to')).toBeTruthy();
    expect(screen.getByText('Network fee')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('Confirmed')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Copy transaction hash' }));
    expect(Clipboard.setString).toHaveBeenCalledWith(HASH);
    expect(toastMessage()).toBe('Transaction hash copied');

    await fireEvent.press(screen.getByRole('button', { name: 'View on Gnoscan' }));
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining(`txhash=${HASH}`));

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('omits optional rows for a failed outgoing call', async () => {
    const { env } = await setupWallet();
    const minimal: Activity = { hash: HASH, type: 'CONTRACT_CALL', title: 'Swap', status: 'FAIL', direction: 'out', amount: { value: '5', denom: 'ugnot' } };

    await renderScreen(ActivityDetailScreen, { env, params: { activity: minimal } });

    expect(screen.getAllByText('Swap').length).toBeGreaterThan(0);
    expect(screen.getByText('-')).toBeTruthy();
    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.queryByText('From')).toBeNull();
    expect(screen.queryByText('To')).toBeNull();
    expect(screen.queryByText('Network fee')).toBeNull();
    expect(screen.queryByText('Block')).toBeNull();
    await settle();
  });

  it('colors a plain outgoing transfer and hides the explorer without one', async () => {
    const { env } = await setupWallet();

    env.container.networkService.selectNetwork('atomone-testnet-1');
    await renderScreen(ActivityDetailScreen, { env, params: { activity: { ...full, direction: 'out', extraInfo: undefined } } });

    expect(screen.getByText('Receive')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'View on Gnoscan' })).toBeNull();
    await settle();
  });
});
