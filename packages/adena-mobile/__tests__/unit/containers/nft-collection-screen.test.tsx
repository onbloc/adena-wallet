import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { NftCollectionScreen } from '../../../src/containers/main/nft-collection-screen';
import { NftCollection, NftItem } from '../../../src/domain/nft';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';

jest.setTimeout(20_000);

const collection: NftCollection = {
  id: 'gno.land/r/demo/nft.NFT.1',
  packagePath: 'gno.land/r/demo/nft',
  name: 'Demo',
  symbol: 'NFT',
  ownedCount: 2,
  thumbnailNftId: '7',
  supportsTokenUri: true,
  supportsMetadata: false,
};
const item = (nftId: string): NftItem => ({ collectionId: collection.id, packagePath: collection.packagePath, nftId, name: 'Demo', symbol: 'NFT' });

describe('NftCollectionScreen', () => {
  beforeEach(() => {
    resetStores();
    jest.restoreAllMocks();
  });

  it('loads more items and opens one', async () => {
    const { env } = await setupWallet();
    const getItems = jest.spyOn(env.container.nftService, 'getItems')
      .mockImplementation(async (_account, _network, _collection, cursor) => (cursor
        ? { items: [item('8')], cursor: null, hasNext: false }
        : { items: [item('7')], cursor: 'c1', hasNext: true }));
    const getTokenUri = jest.spyOn(env.container.nftService, 'getTokenUri').mockResolvedValue('https://x.io/7.png');
    const { navigation } = await renderScreen(NftCollectionScreen, { env, params: { collection } });

    expect(screen.getByText('2 owned · NFT')).toBeTruthy();
    await fireEvent.press(await screen.findByRole('button', { name: 'Demo #7' }));
    expect(navigation.navigate).toHaveBeenCalledWith('NftDetail', { collection, item: item('7') });
    expect(getTokenUri).toHaveBeenCalledWith(expect.anything(), collection.packagePath, '7');

    await fireEvent.press(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('button', { name: 'Demo #8' })).toBeTruthy();
    expect(getItems).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), collection, 'c1');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull());

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('shows load errors and skips token URIs when unsupported', async () => {
    const { env } = await setupWallet();

    jest.spyOn(env.container.nftService, 'getItems').mockRejectedValue(new Error('api down'));
    const getTokenUri = jest.spyOn(env.container.nftService, 'getTokenUri');

    await renderScreen(NftCollectionScreen, { env, params: { collection: { ...collection, supportsTokenUri: false } } });

    expect(await screen.findByText('api down')).toBeTruthy();
    expect(getTokenUri).not.toHaveBeenCalled();
  });
});
