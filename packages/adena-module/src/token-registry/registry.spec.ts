import { TokenRegistryImpl } from './registry';
import {
  ALL_TOKENS,
  UATONE,
  UATONE_TESTNET,
  UGNOT,
  UPHOTON,
  UPHOTON_TESTNET,
} from './entries';

describe('TokenRegistry', () => {
  let registry: TokenRegistryImpl;

  beforeEach(() => {
    registry = new TokenRegistryImpl();
    ALL_TOKENS.forEach((token) => registry.register(token));
  });

  it('get returns correct token by id', () => {
    const token = registry.get('atomone-1:uatone');
    expect(token).toBeDefined();
    expect(token).toEqual(UATONE);
  });

  it('get nonexistent id returns undefined', () => {
    const token = registry.get('nonexistent:token');
    expect(token).toBeUndefined();
  });

  it('list returns all tokens when no chainProfileId given', () => {
    const tokens = registry.list();
    expect(tokens).toHaveLength(ALL_TOKENS.length);
  });

  it('list filters by chainProfileId atomone-1', () => {
    const tokens = registry.list('atomone-1');
    expect(tokens).toHaveLength(2);
    expect(tokens).toEqual(expect.arrayContaining([UATONE, UPHOTON]));
  });

  it('list filters by chainProfileId atomone-testnet-1', () => {
    const tokens = registry.list('atomone-testnet-1');
    expect(tokens).toHaveLength(2);
    expect(tokens).toEqual(expect.arrayContaining([UATONE_TESTNET, UPHOTON_TESTNET]));
  });

  it('list filters by chainProfileId gnoland1', () => {
    const tokens = registry.list('gnoland1');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual(UGNOT);
  });

  it('list returns empty array for unknown chainProfileId', () => {
    const tokens = registry.list('unknown-chain');
    expect(tokens).toHaveLength(0);
  });
});
