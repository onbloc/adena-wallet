import Clipboard from '@react-native-clipboard/clipboard';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { HomeScreen } from '../../../src/containers/main/home-screen';
import { NftCollection } from '../../../src/domain/nft';
import { ManagedToken, tokenPriceKey, TokenSource } from '../../../src/domain/token';
import { getNativeTokenFor } from '../../../src/resources';
import { renderScreen, resetStores, setupWallet, TestEnv, toastMessage } from '../../helpers/render-screen';

const collection = (overrides: Partial<NftCollection> = {}): NftCollection => ({
  id: 'gno.land/r/demo/nft.NFT.1',
  packagePath: 'gno.land/r/demo/nft',
  name: 'Demo',
  symbol: 'NFT',
  ownedCount: 2,
  thumbnailNftId: '7',
  supportsTokenUri: true,
  supportsMetadata: false,
  ...overrides,
});

const stubAssets = (env: TestEnv, { amount = '1500000', price }: { amount?: string; price?: { usd: number; change24h: number | null } | null } = {}) => {
  const network = env.container.networkService.getCurrentNetwork();
  const native: ManagedToken = { ...getNativeTokenFor(network), visible: true, source: TokenSource.DEFAULT };

  jest.spyOn(env.container.tokenService, 'getTokenList').mockResolvedValue([native]);
  jest.spyOn(env.container.tokenService, 'getBalances').mockResolvedValue({ [native.id]: amount });
  jest.spyOn(env.container.priceService, 'getPrices').mockImplementation(async () => (price === null || price === undefined
    ? (price === null ? Promise.reject(new Error('no prices')) : {})
    : { [tokenPriceKey(native.id, network.id)]: { tokenId: native.id, networkId: network.id, ...price } }));
  return native;
};

const refresh = async (): Promise<void> => {
  const [scroll] = screen.root!.queryAll(node => typeof node.props.refreshControl?.props?.onRefresh === 'function');

  await act(async () => {
    scroll.props.refreshControl.props.onRefresh();
  });
};

jest.setTimeout(20_000);

describe('HomeScreen', () => {
  beforeEach(() => {
    resetStores();
    jest.restoreAllMocks();
  });

  afterEach(() => act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  }));

  it('shows the portfolio with a positive change and routes every action', async () => {
    const { env, address } = await setupWallet();
    const native = stubAssets(env, { price: { usd: 2, change24h: 10 } });

    jest.spyOn(env.container.nftService, 'getCollections').mockResolvedValue([]);
    const { navigation } = await renderScreen(HomeScreen, { env });

    expect(await screen.findByText(/\+\d+\.\d+%\) today/)).toBeTruthy();
    expect(screen.getByText('(+10.00%) today', { exact: false })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Copy address' }));
    expect(Clipboard.setString).toHaveBeenCalledWith(address);
    expect(toastMessage()).toBe('Address copied');

    const presses: [string, unknown[]][] = [
      ['Switch account', ['Accounts']],
      ['Settings', ['Settings']],
      ['Scan QR code', ['QrScanner']],
      ['Manage tokens', ['ManageTokens']],
      ['Send', ['SendRecipient']],
      ['Receive', ['Receive']],
    ];

    for (const [name, args] of presses) {
      await fireEvent.press(screen.getByRole('button', { name }));
      expect(navigation.navigate).toHaveBeenLastCalledWith(...args);
    }

    await fireEvent.press(screen.getByText(native.name));
    expect(navigation.navigate).toHaveBeenLastCalledWith('TokenDetails', { tokenId: native.id });

    await refresh();
    await waitFor(() => expect(env.container.tokenService.getTokenList).toHaveBeenCalledTimes(2));
  });

  it('asks for a backup of a new wallet until it is done, and drops a reminder confirmed by the cloud', async () => {
    const { env, account } = await setupWallet();

    stubAssets(env);
    env.container.backupReminder.require(account.keyringId);
    jest.spyOn(env.container.cloudBackupService, 'getStatus').mockResolvedValue({ kind: 'none' });
    const { navigation } = await renderScreen(HomeScreen, { env });

    await fireEvent.press(await screen.findByTestId('home-backup-reminder'));
    expect(navigation.navigate).toHaveBeenCalledWith('RecoveryPhrase', { keyringId: account.keyringId });
    expect(env.container.backupReminder.getKeyringId()).toBe(account.keyringId);
  });

  it('clears the reminder once the cloud confirms the upload', async () => {
    const { env, account } = await setupWallet();

    stubAssets(env);
    env.container.backupReminder.require(account.keyringId);
    jest.spyOn(env.container.cloudBackupService, 'getStatus').mockResolvedValue({
      kind: 'backedUp', fileName: 'f', backedUpAt: 1, outdated: false, mnemonicCount: 1, privateKeyCount: 0,
    });
    await renderScreen(HomeScreen, { env });

    await waitFor(() => expect(env.container.backupReminder.getKeyringId()).toBeNull());
    expect(screen.queryByTestId('home-backup-reminder')).toBeNull();
  });

  it('colors a negative change and a zero-value portfolio', async () => {
    const { env } = await setupWallet();

    stubAssets(env, { price: { usd: 2, change24h: -5 } });
    await renderScreen(HomeScreen, { env });
    expect(await screen.findByText('(-5.00%) today', { exact: false })).toBeTruthy();
  });

  it('omits the caption when the change is unknown', async () => {
    const { env } = await setupWallet();

    stubAssets(env, { amount: '0', price: { usd: 2, change24h: 10 } });
    await renderScreen(HomeScreen, { env });
    expect(await screen.findAllByText('$0.00')).not.toHaveLength(0);
    expect(screen.queryByText(/today/)).toBeNull();
  });

  it('falls back to the native balance without prices and reports balance errors', async () => {
    const { env } = await setupWallet();

    stubAssets(env, { price: null });
    await renderScreen(HomeScreen, { env });
    expect(await screen.findAllByText('1.5 GNOT')).not.toHaveLength(0);

    jest.spyOn(env.container.tokenService, 'getBalances').mockRejectedValue(new Error('rpc down'));
    await refresh();
    expect(await screen.findByText('rpc down')).toBeTruthy();
  });

  it('lists NFT collections and opens the selected one', async () => {
    const { env } = await setupWallet();

    stubAssets(env);
    const demo = collection();
    const other = collection({ id: 'gno.land/r/demo/art.ART.1', packagePath: 'gno.land/r/demo/art', name: 'Art', thumbnailNftId: undefined, supportsTokenUri: false });

    jest.spyOn(env.container.nftService, 'getCollections').mockResolvedValue([demo, other]);
    jest.spyOn(env.container.nftService, 'getTokenUri').mockResolvedValue('https://x.io/7.png');
    const { navigation } = await renderScreen(HomeScreen, { env });

    await fireEvent.press(screen.getByRole('tab', { name: 'NFTs' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Demo' }));
    expect(navigation.navigate).toHaveBeenLastCalledWith('NftCollection', { collection: demo });
    expect(env.container.nftService.getTokenUri).toHaveBeenCalledWith(expect.anything(), demo.packagePath, '7');

    await fireEvent.press(screen.getByRole('button', { name: 'Manage NFTs' }));
    expect(navigation.navigate).toHaveBeenLastCalledWith('ManageNfts');
  });

  it('explains that NFTs are unavailable on networks without an API', async () => {
    const { env } = await setupWallet();

    env.container.networkService.selectNetwork('gnoswap');
    stubAssets(env);
    await renderScreen(HomeScreen, { env });

    expect(screen.getByText('Gno.land Gnoswap', { exact: false })).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'NFTs' }));
    expect(screen.getByText('NFTs are not available')).toBeTruthy();
  });

  it('renders without an account', async () => {
    await renderScreen(HomeScreen);

    expect(screen.getByRole('button', { name: 'Switch account' })).toBeTruthy();
  });
});
