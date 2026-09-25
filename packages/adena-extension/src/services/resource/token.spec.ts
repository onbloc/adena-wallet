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

  it('takes decimals of 0 from the resource, but never an absent one', async () => {
    const withZero = makeRepository(
      [{ ...contractWugnot, decimals: 6 }],
      [{ ...resourceWugnot, decimals: 0 }],
    );
    const [zeroToken] = await new TokenService(withZero.repository).getTokenMetainfosByAccountId(
      ACCOUNT_ID,
    );
    expect(zeroToken.decimals).toBe(0);

    const withNone = makeRepository(
      [{ ...contractWugnot, decimals: 6 }],
      [{ ...resourceWugnot, decimals: undefined as unknown as number }],
    );
    const [keptToken] = await new TokenService(withNone.repository).getTokenMetainfosByAccountId(
      ACCOUNT_ID,
    );
    expect(keptToken.decimals).toBe(6);
  });

  it('leaves a token with no resource document exactly as the chain describes it', async () => {
    const { repository } = makeRepository(
      [{ ...contractWugnot, image: 'https://indexer.example/wugnot.png' }],
      [],
    );

    const [token] = await new TokenService(repository).getTokenMetainfosByAccountId(ACCOUNT_ID);

    expect(token).toEqual({ ...contractWugnot, image: 'https://indexer.example/wugnot.png' });
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
