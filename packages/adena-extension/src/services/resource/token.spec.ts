import { GRC20TokenModel, NativeTokenModel, TokenModel } from '@types';

import { ITokenRepository } from '@repositories/common/types';
import { TokenService } from './token';

const ACCOUNT_ID = 'account-1';

/**
 * The same GRC20 token as the two sources describe it: what the realm published
 * on chain, and the curated document in gno-token-resource.
 */
const contractWugnot: GRC20TokenModel = {
  main: false,
  display: true,
  tokenId: 'gno.land/r/gnoland/wugnot.wugnot',
  networkId: 'gnoland-1',
  type: 'grc20',
  pkgPath: 'gno.land/r/gnoland/wugnot',
  name: 'wrapped GNOT',
  symbol: 'wugnot',
  decimals: 0,
  image: '',
};

const resourceWugnot: GRC20TokenModel = {
  ...contractWugnot,
  display: false,
  name: 'wGNOT',
  description: 'wugnot is a wrapped GRC20 version of GNOT.',
  websiteUrl: 'https://gno.land/r/gnoland/wugnot',
  image: 'https://resource.example/wugnot.svg',
};

function makeRepository(
  storedTokens: TokenModel[],
  resourceTokens: TokenModel[] | Error,
  contractTokens: GRC20TokenModel[] = storedTokens.filter(
    (token): token is GRC20TokenModel => token.type === 'grc20',
  ),
): { repository: ITokenRepository; updateTokenMetainfos: jest.Mock } {
  const updateTokenMetainfos = jest.fn().mockResolvedValue(true);

  const repository = {
    getAccountTokenMetainfos: jest.fn().mockResolvedValue(storedTokens),
    fetchTokenMetainfos: jest
      .fn()
      .mockImplementation(() =>
        resourceTokens instanceof Error
          ? Promise.reject(resourceTokens)
          : Promise.resolve(resourceTokens),
      ),
    updateTokenMetainfos,
    // The three ways a GRC20 token reaches the wallet straight from its
    // contract, none of which pass through the account's stored metainfos.
    fetchAllGRC20Tokens: jest.fn().mockResolvedValue(contractTokens),
    fetchGRC20Tokens: jest
      .fn()
      .mockResolvedValue({ items: contractTokens, totalCount: contractTokens.length }),
    fetchGRC20TokenByPackagePath: jest.fn().mockResolvedValue(contractTokens[0]),
    fetchAccountGRC20Tokens: jest.fn().mockResolvedValue(contractTokens),
  } as unknown as ITokenRepository;

  return { repository, updateTokenMetainfos };
}

describe('TokenService resource metadata priority', () => {
  it('lets the gno-token-resource document win over the contract data', async () => {
    const { repository } = makeRepository([contractWugnot], [resourceWugnot]);

    const [token] = await new TokenService(repository).getTokenMetainfosByAccountId(ACCOUNT_ID);

    expect(token.name).toBe('wGNOT');
    expect(token.image).toBe('https://resource.example/wugnot.svg');
    expect(token.description).toBe(resourceWugnot.description);
    expect(token.websiteUrl).toBe(resourceWugnot.websiteUrl);
  });

  it('keeps the stored display flag, which is the account`s choice and not the resource`s', async () => {
    const { repository } = makeRepository([contractWugnot], [resourceWugnot]);

    const [token] = await new TokenService(repository).getTokenMetainfosByAccountId(ACCOUNT_ID);

    expect(token.display).toBe(true);
  });

  it('falls back to contract data for every field the resource leaves empty', async () => {
    const sparseResource: GRC20TokenModel = {
      ...resourceWugnot,
      name: '',
      symbol: '',
      image: '',
      description: undefined,
      websiteUrl: undefined,
    };
    const { repository } = makeRepository(
      [{ ...contractWugnot, image: 'https://indexer.example/wugnot.png' }],
      [sparseResource],
    );

    const [token] = await new TokenService(repository).getTokenMetainfosByAccountId(ACCOUNT_ID);

    expect(token.name).toBe('wrapped GNOT');
    expect(token.symbol).toBe('wugnot');
    expect(token.image).toBe('https://indexer.example/wugnot.png');
  });

  it('takes the resource decimals over the contract`s, either way they disagree', async () => {
    // wugnot is the one token the two sources disagree about, and the curated
    // value is what says how many places a balance should be read in.
    const curatedSix = makeRepository(
      [{ ...contractWugnot, decimals: 0 }],
      [{ ...resourceWugnot, decimals: 6 }],
    );
    const [sixToken] = await new TokenService(curatedSix.repository).getTokenMetainfosByAccountId(
      ACCOUNT_ID,
    );
    expect(sixToken.decimals).toBe(6);

    const curatedZero = makeRepository(
      [{ ...contractWugnot, decimals: 6 }],
      [{ ...resourceWugnot, decimals: 0 }],
    );
    const [zeroToken] = await new TokenService(curatedZero.repository).getTokenMetainfosByAccountId(
      ACCOUNT_ID,
    );
    expect(zeroToken.decimals).toBe(0);
  });

  it('keeps the contract decimals when the resource states none', async () => {
    const { repository } = makeRepository(
      [{ ...contractWugnot, decimals: 6 }],
      [{ ...resourceWugnot, decimals: undefined as unknown as number }],
    );

    const [token] = await new TokenService(repository).getTokenMetainfosByAccountId(ACCOUNT_ID);

    expect(token.decimals).toBe(6);
  });

  it('overlays the resource onto every GRC20 read straight from the contract', async () => {
    const { repository } = makeRepository(
      [],
      [{ ...resourceWugnot, decimals: 6 }],
      [{ ...contractWugnot, decimals: 0 }],
    );
    const service = new TokenService(repository);

    const [fromRegistry] = await service.fetchGRC20Tokens();
    expect([fromRegistry.decimals, fromRegistry.name]).toEqual([6, 'wGNOT']);

    const { items } = await service.fetchGRC20TokensPaged({ offset: 0, limit: 10 });
    expect([items[0].decimals, items[0].name]).toEqual([6, 'wGNOT']);

    const single = await service.fetchGRC20Token(contractWugnot.tokenId);
    expect([single?.decimals, single?.name]).toEqual([6, 'wGNOT']);

    const held = await service.fetchAccountGRC20Tokens('g1address');
    expect([held?.[0].decimals, held?.[0].name]).toEqual([6, 'wGNOT']);
  });

  it('keeps `pkgPath` on an overlaid GRC20 token, which transfers are addressed by', async () => {
    const { repository } = makeRepository([], [resourceWugnot], [contractWugnot]);

    const [token] = await new TokenService(repository).fetchGRC20Tokens();

    expect(token.pkgPath).toBe('gno.land/r/gnoland/wugnot');
  });

  it('leaves a token with no resource document exactly as the chain describes it', async () => {
    const { repository } = makeRepository(
      [{ ...contractWugnot, image: 'https://indexer.example/wugnot.png' }],
      [],
    );

    const [token] = await new TokenService(repository).getTokenMetainfosByAccountId(ACCOUNT_ID);

    expect(token).toEqual({ ...contractWugnot, image: 'https://indexer.example/wugnot.png' });
  });

  // The documents are fetched for the selected network, while the stored tokens
  // are account-wide, and a testnet shares both its denoms and its realm paths
  // with mainnet — so identity alone would let one network's document describe
  // another network's token.
  it('leaves a stored token of another network untouched', async () => {
    const stagingWugnot: GRC20TokenModel = { ...contractWugnot, networkId: 'staging' };
    const { repository } = makeRepository([contractWugnot, stagingWugnot], [resourceWugnot]);

    const [mainnet, staging] = await new TokenService(repository).getTokenMetainfosByAccountId(
      ACCOUNT_ID,
    );

    expect(mainnet.name).toBe('wGNOT');
    expect(staging).toEqual(stagingWugnot);
  });

  // The overlay is written back, so an overlay that crossed networks would not
  // just be displayed — it would replace what the wallet stored for that token.
  it('does not persist another network`s document over a stored token', async () => {
    const stagingWugnot: GRC20TokenModel = { ...contractWugnot, networkId: 'staging' };
    const { repository, updateTokenMetainfos } = makeRepository([], [resourceWugnot]);

    await new TokenService(repository).updateTokenMetainfosByAccountId(ACCOUNT_ID, [stagingWugnot]);

    expect(updateTokenMetainfos).toHaveBeenCalledWith(ACCOUNT_ID, [stagingWugnot]);
  });

  it('degrades to contract data when the resource cannot be fetched', async () => {
    const { repository } = makeRepository([contractWugnot], new Error('offline'));

    await expect(
      new TokenService(repository).getTokenMetainfosByAccountId(ACCOUNT_ID),
    ).resolves.toEqual([contractWugnot]);
  });

  it('matches a native token by symbol so GNOT keeps its curated copy', async () => {
    const storedGnot: NativeTokenModel = {
      main: true,
      display: true,
      tokenId: 'ugnot',
      networkId: 'gnoland-1',
      type: 'gno-native',
      name: 'gnot',
      symbol: 'GNOT',
      denom: 'ugnot',
      decimals: 6,
      image: '',
    };
    const { repository } = makeRepository(
      [storedGnot],
      [{ ...storedGnot, name: 'Gno.land', image: 'https://resource.example/ugnot.svg' }],
    );

    const [token] = await new TokenService(repository).getTokenMetainfosByAccountId(ACCOUNT_ID);

    expect(token.name).toBe('Gno.land');
    expect(token.image).toBe('https://resource.example/ugnot.svg');
  });

  it('persists the resource-first shape, so a write does not reinstate contract copy', async () => {
    const { repository, updateTokenMetainfos } = makeRepository([], [resourceWugnot]);

    await new TokenService(repository).updateTokenMetainfosByAccountId(ACCOUNT_ID, [
      contractWugnot,
    ]);

    expect(updateTokenMetainfos).toHaveBeenCalledWith(ACCOUNT_ID, [
      expect.objectContaining({
        name: 'wGNOT',
        display: true,
        image: 'https://resource.example/wugnot.svg',
      }),
    ]);
  });
});
