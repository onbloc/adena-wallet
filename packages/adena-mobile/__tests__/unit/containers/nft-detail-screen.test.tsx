import { act, fireEvent, screen } from '@testing-library/react-native';

import { NftDetailScreen } from '../../../src/containers/main/nft-detail-screen';
import { NftCollection, NftItem } from '../../../src/domain/nft';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';

jest.setTimeout(20_000);

const collection: NftCollection = {
  id: 'gno.land/r/demo/nft.NFT.1',
  packagePath: 'gno.land/r/demo/nft',
  name: 'Demo collection',
  symbol: 'NFT',
  ownedCount: 2,
  supportsTokenUri: true,
  supportsMetadata: true,
};
const item: NftItem = { collectionId: collection.id, packagePath: collection.packagePath, nftId: '7', name: 'Demo', symbol: 'NFT' };

describe('NftDetailScreen', () => {
  beforeEach(() => {
    resetStores();
    jest.restoreAllMocks();
  });

  it('prefers metadata and sends the NFT', async () => {
    const { env } = await setupWallet();

    jest.spyOn(env.container.nftService, 'getTokenUri').mockResolvedValue(null);
    jest.spyOn(env.container.nftService, 'getMetadata').mockResolvedValue({
      name: 'Golden Gnome',
      description: 'A rare gnome.',
      image: 'https://x.io/7.png',
      attributes: [{ traitType: 'Hat', value: 'Red' }],
    });
    const { navigation } = await renderScreen(NftDetailScreen, { env, params: { collection, item } });

    expect(await screen.findByText('Golden Gnome')).toBeTruthy();
    expect(screen.getByText('A rare gnome.')).toBeTruthy();
    expect(screen.getByText('Traits')).toBeTruthy();
    expect(screen.getByText('Red')).toBeTruthy();
    expect(screen.getByText('Account 1')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(navigation.navigate).toHaveBeenCalledWith('SendNft', { collection, item });
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('falls back to the item name without metadata or an account', async () => {
    const getMetadata = jest.spyOn((await setupWallet()).env.container.nftService, 'getMetadata');

    await renderScreen(NftDetailScreen, { params: { collection: { ...collection, supportsTokenUri: false, supportsMetadata: false }, item } });

    expect(screen.getByText('Demo #7')).toBeTruthy();
    expect(screen.getByText('-')).toBeTruthy();
    expect(screen.queryByText('Traits')).toBeNull();
    expect(getMetadata).not.toHaveBeenCalled();
    await act(async () => undefined);
  });
});
