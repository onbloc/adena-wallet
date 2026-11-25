import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SearchScreen } from '../../../../src/containers/main/search-screen';
import { Account } from '../../../../src/domain/account';
import { Network } from '../../../../src/domain/network';
import { NftCollection } from '../../../../src/domain/nft';
import { ManagedToken, Token, TokenSource, TokenType } from '../../../../src/domain/token';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const OTHER: Network = { ...NETWORK, id: 'gno-other', networkName: 'Other' };
const CUSTOM: Network = { ...NETWORK, id: 'custom:x', networkName: 'Custom', isCustom: true };
const SAVINGS: Account = { ...ACCOUNT, id: 'acc-2', name: 'Gnome Savings', avatarColor: 'teal' };
const CONTACT_ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const GNOT_BASE = { id: 'ugnot', family: NETWORK.family, type: TokenType.NATIVE, name: 'Gno.land', symbol: 'GNOT', decimals: 6, isNative: true };

const token = (networkId: string, overrides: Partial<Token> = {}): ManagedToken => ({ ...GNOT_BASE, networkId, visible: true, source: TokenSource.DEFAULT, ...overrides });
const REGISTRY_TOKEN: Token = { ...token(NETWORK.id), id: 'gno.land/r/demo/gnome.GNOME', type: TokenType.GRC20, name: 'Gnome Token', symbol: 'GNOME', isNative: false };
const COLLECTION: NftCollection = { id: 'gno.land/r/demo/gnomes', packagePath: 'gno.land/r/demo/gnomes', name: 'Gnome Punks', symbol: 'GP', ownedCount: 1, supportsTokenUri: false, supportsMetadata: false };

const HIDDEN: NftCollection = { ...COLLECTION, id: 'gno.land/r/demo/gnomes2', packagePath: 'gno.land/r/demo/gnomes2', name: 'Gnome Hidden' };

const setup = async () => {
  const selectNetwork = jest.fn();
  const getCachedTokenList = jest.fn((_account: Account, network: Network) => [token(network.id)]);
  const { Wrapper } = createWrapper({
    accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT, SAVINGS], getAddress: (account: Account) => `g1${account.id}` },
    networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK, OTHER, CUSTOM], selectNetwork },
    tokenService: {
      getTokenList: async () => [token(NETWORK.id)],
      getCachedTokenList,
      searchRegistry: async () => ({ tokens: [REGISTRY_TOKEN, token(NETWORK.id)], total: 2 }),
    },
    addressBookService: {
      getEntries: () => [{ id: 'c1', name: 'Gnad', address: CONTACT_ADDRESS, createdAt: 0 }],
      getEntriesFor: () => [{ id: 'c1', name: 'Gnad', address: CONTACT_ADDRESS, createdAt: 0 }],
    },
    chainRegistry: { forNetwork: () => ({ isValidAddress: () => true }) },
    nftService: {
      isSupported: () => true,
      getCollections: async () => [COLLECTION, HIDDEN],
      getPreferences: () => ({ hidden: [HIDDEN.packagePath], pinned: [] }),
      getTokenUri: async () => null,
    },
  });
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const Screen = SearchScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={navigation} route={{ key: 'Search', name: 'Search' }} /></Wrapper>
    </SafeAreaProvider>,
  );

  return { navigation, selectNetwork, getCachedTokenList };
};

const search = async (value: string): Promise<void> => {
  await fireEvent.changeText(screen.getByLabelText('Tokens, wallets or collections'), value);
  // Debounce plus the query cache settling.
  await act(() => new Promise<void>((done) => {
    setTimeout(done, 250);
  }));
};

describe('SearchScreen', () => {
  afterEach(() => act(() => new Promise<void>((done) => {
    setTimeout(done, 0);
  })));

  it('starts with a hint and searches tokens on every built-in network', async () => {
    const { getCachedTokenList } = await setup();

    expect(screen.getByText('Search your wallet')).toBeTruthy();
    await search('gno');

    expect(screen.getByRole('button', { name: 'Gno.land, GNOT' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gno.land, GNOT · Gno.land Other' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gnome Token, GNOME · Not added' })).toBeTruthy();
    expect(getCachedTokenList.mock.calls.map(([, network]) => network.id)).not.toContain(CUSTOM.id);

    await fireEvent.press(screen.getByRole('button', { name: 'All networks' }));
    expect(screen.queryByRole('button', { name: 'Gno.land, GNOT · Gno.land Other' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Gno.land Testnet' })).toBeTruthy();
  });

  it('opens tokens, wallets and collections', async () => {
    const { navigation } = await setup();

    await search('gn');
    await fireEvent.press(screen.getByRole('button', { name: 'Gno.land, GNOT' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Gnome Token, GNOME · Not added' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Gnome Savings, g1acc-2' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Gnad, g1jg8m...fvsqf5' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Gnome Punks, Gno.land · NFT collection' }));

    expect(screen.queryByText('Gnome Hidden')).toBeNull();
    expect(navigation.navigate.mock.calls).toEqual([
      ['TokenDetails', { tokenId: 'ugnot' }],
      ['AddToken', { query: REGISTRY_TOKEN.id }],
      ['AccountSettings', { accountId: SAVINGS.id }],
      ['SendRecipient', { scannedAddress: CONTACT_ADDRESS }],
      ['NftCollection', { collection: COLLECTION }],
    ]);
  });

  it('asks before switching to the token network', async () => {
    const { navigation, selectNetwork } = await setup();

    await search('gnot');
    await fireEvent.press(screen.getByRole('button', { name: 'Gno.land, GNOT · Gno.land Other' }));
    expect(screen.getByText('Switch to Gno.land Other?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(selectNetwork).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Gno.land, GNOT · Gno.land Other' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Switch' }));
    expect(selectNetwork).toHaveBeenCalledWith(OTHER.id);
    expect(navigation.navigate).toHaveBeenCalledWith('TokenDetails', { tokenId: 'ugnot' });
  });

  it('shows the no-result state', async () => {
    await setup();
    await search('zzz');

    expect(screen.getByText('No results for "zzz"')).toBeTruthy();
  });
});
