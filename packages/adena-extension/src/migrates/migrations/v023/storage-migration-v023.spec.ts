import { StorageMigration023 } from './storage-migration-v023';

const BASE_DATA = {
  NETWORKS: [],
  CURRENT_CHAIN_ID: 'gnoland1',
  CURRENT_NETWORK_ID: 'gnoland1',
  SERIALIZED: 'serialized-blob',
  ENCRYPTED_STORED_PASSWORD: 'encrypted-pw',
  CURRENT_ACCOUNT_ID: 'acc-1',
  ACCOUNT_NAMES: { 'acc-1': 'Main' },
  ESTABLISH_SITES: {},
  ADDRESS_BOOK: 'encrypted-address-book',
  ACCOUNT_TOKEN_METAINFOS: {},
  QUESTIONNAIRE_EXPIRED_DATE: null,
  WALLET_CREATION_GUIDE_CONFIRM_DATE: null,
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: null,
  ACCOUNT_GRC721_COLLECTIONS: {},
  ACCOUNT_GRC721_PINNED_PACKAGES: {},
  KDF_SALT: 'abc123',
  SESSIONS: {},
};

const GNOT_TOKEN = {
  main: true,
  tokenId: 'ugnot',
  networkId: 'gnoland1',
  display: true,
  type: 'gno-native' as const,
  name: 'Gno.land',
  symbol: 'GNOT',
  decimals: 6,
  denom: 'ugnot',
  image: '',
};

const GRC20_TOKEN = {
  main: false,
  tokenId: 'gno.land/r/demo/foo20',
  networkId: 'gnoland1',
  display: true,
  type: 'grc20' as const,
  name: 'Foo',
  symbol: 'FOO',
  decimals: 6,
  pkgPath: 'gno.land/r/demo/foo20',
  image: '',
};

function makeInput(overrides: Partial<typeof BASE_DATA> = {}) {
  return { version: 22 as const, data: { ...BASE_DATA, ...overrides } };
}

describe('StorageMigration023', () => {
  it('version is 23', () => {
    expect(new StorageMigration023().version).toBe(23);
  });

  it('bumps the model version to 23', async () => {
    const result = await new StorageMigration023().up(makeInput());
    expect(result.version).toBe(23);
  });

  it('re-keys a GRC20 tokenId to the token key `{pkgPath}.{symbol}`', async () => {
    const result = await new StorageMigration023().up(
      makeInput({ ACCOUNT_TOKEN_METAINFOS: { 'acc-1': [{ ...GRC20_TOKEN }] } }),
    );
    const token = result.data.ACCOUNT_TOKEN_METAINFOS['acc-1'][0];
    expect(token.tokenId).toBe('gno.land/r/demo/foo20.FOO');
    // pkgPath and every other field are preserved.
    expect(token.pkgPath).toBe('gno.land/r/demo/foo20');
    expect(token.symbol).toBe('FOO');
    expect(token.decimals).toBe(6);
  });

  it('leaves native (non-GRC20) tokens untouched', async () => {
    const result = await new StorageMigration023().up(
      makeInput({ ACCOUNT_TOKEN_METAINFOS: { 'acc-1': [{ ...GNOT_TOKEN }] } }),
    );
    expect(result.data.ACCOUNT_TOKEN_METAINFOS['acc-1'][0].tokenId).toBe('ugnot');
  });

  it('re-keys GRC20 tokens across multiple accounts and preserves others', async () => {
    const result = await new StorageMigration023().up(
      makeInput({
        ACCOUNT_TOKEN_METAINFOS: {
          'acc-1': [{ ...GNOT_TOKEN }, { ...GRC20_TOKEN }],
          'acc-2': [
            {
              ...GRC20_TOKEN,
              tokenId: 'gno.land/r/demo/bar',
              pkgPath: 'gno.land/r/demo/bar',
              symbol: 'BAR',
            },
          ],
        },
      }),
    );
    expect(result.data.ACCOUNT_TOKEN_METAINFOS['acc-1'][0].tokenId).toBe('ugnot');
    expect(result.data.ACCOUNT_TOKEN_METAINFOS['acc-1'][1].tokenId).toBe(
      'gno.land/r/demo/foo20.FOO',
    );
    expect(result.data.ACCOUNT_TOKEN_METAINFOS['acc-2'][0].tokenId).toBe('gno.land/r/demo/bar.BAR');
  });

  it('is idempotent-safe when pkgPath or symbol is missing', async () => {
    const result = await new StorageMigration023().up(
      makeInput({
        ACCOUNT_TOKEN_METAINFOS: {
          'acc-1': [{ ...GRC20_TOKEN, pkgPath: undefined as never }],
        },
      }),
    );
    // With no pkgPath there is nothing to build a token path from — left as-is.
    expect(result.data.ACCOUNT_TOKEN_METAINFOS['acc-1'][0].tokenId).toBe('gno.land/r/demo/foo20');
  });

  it('throws when the previous model shape is invalid', async () => {
    const invalid = { version: 22 as const, data: { foo: 'bar' } as never };
    await expect(new StorageMigration023().up(invalid)).rejects.toThrow(
      'Storage Data does not match version V022',
    );
  });
});
