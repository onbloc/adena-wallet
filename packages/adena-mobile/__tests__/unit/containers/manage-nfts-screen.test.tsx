import { fireEvent, screen } from '@testing-library/react-native';

import { ManageNftsScreen } from '../../../src/containers/main/manage-nfts-screen';
import { NftCollection } from '../../../src/domain/nft';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';

jest.setTimeout(20_000);

const collection: NftCollection = {
  id: 'gno.land/r/demo/nft.NFT.1',
  packagePath: 'gno.land/r/demo/nft',
  name: 'Demo',
  symbol: 'NFT',
  ownedCount: 2,
  supportsTokenUri: false,
  supportsMetadata: false,
};

describe('ManageNftsScreen', () => {
  beforeEach(() => {
    resetStores();
    jest.restoreAllMocks();
  });

  it('pins and hides collections', async () => {
    const { env, account, network } = await setupWallet();

    jest.spyOn(env.container.nftService, 'getCollections').mockResolvedValue([collection]);
    const { navigation } = await renderScreen(ManageNftsScreen, { env });
    const preferences = () => env.container.nftService.getPreferences(account, network);

    await fireEvent.press(await screen.findByRole('button', { name: 'Pin Demo' }));
    expect(preferences().pinned).toEqual([collection.packagePath]);
    await fireEvent.press(screen.getByRole('button', { name: 'Unpin Demo' }));
    expect(preferences().pinned).toEqual([]);

    await fireEvent.press(screen.getByRole('switch', { name: 'Show Demo' }));
    expect(preferences().hidden).toEqual([collection.packagePath]);
    expect(screen.getByRole('switch', { name: 'Show Demo' }).props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(screen.getByRole('switch', { name: 'Show Demo' }));
    expect(preferences().hidden).toEqual([]);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('shows an empty list without an account', async () => {
    await renderScreen(ManageNftsScreen);

    expect(screen.getByText('No collectibles yet')).toBeTruthy();
  });
});
