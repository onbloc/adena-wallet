import { toBase64 } from '@cosmjs/encoding';

import { KeyringType } from '../../src/crypto/keyring';
import { Account } from '../../src/domain/account';
import { ChainFamily, Network } from '../../src/domain/network';
import { Token, TokenType } from '../../src/domain/token';
import { ChainModule, ChainRegistry } from '../../src/repositories/chain/chain-registry';
import { BUILT_IN_NETWORKS } from '../../src/resources';

export const networkById = (id: string): Network => {
  const network = BUILT_IN_NETWORKS.find(item => item.id === id);

  if (!network) {
    throw new Error(`no built-in network ${id}`);
  }

  return network;
};

export const GNO_NETWORK = networkById('gnoland-1');
export const COSMOS_NETWORK = networkById('atomone-1');

export const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'account-1',
  keyringId: 'keyring-1',
  keyringType: KeyringType.HD_WALLET,
  name: 'Account 1',
  hdIndex: 0,
  publicKey: toBase64(new Uint8Array(33).fill(2)),
  createdAt: 1,
  ...overrides,
});

export const makeToken = (overrides: Partial<Token> = {}): Token => ({
  id: 'gno.land/r/demo/foo.FOO',
  networkId: GNO_NETWORK.id,
  family: ChainFamily.GNO,
  type: TokenType.GRC20,
  name: 'Foo',
  symbol: 'FOO',
  decimals: 6,
  pkgPath: 'gno.land/r/demo/foo',
  isNative: false,
  ...overrides,
});

// Fake address: "<prefix>1" + base64 of the public key, so tests can assert what was passed through.
export const fakeAddress = (publicKey: Uint8Array, network: Network): string => `${network.addressPrefix}1${toBase64(publicKey)}`;

export const createFakeChainModule = (family: ChainFamily) => {
  const module = {
    family,
    chain: {
      family,
      deriveAddress: jest.fn(fakeAddress),
      isValidAddress: jest.fn((address: string, network: Network) => address.startsWith(`${network.addressPrefix}1`)),
      normalizeAddress: jest.fn((address: string, network: Network) => (address.startsWith(`${network.addressPrefix}1`) ? address : null)),
      getChainId: jest.fn(async () => 'fake-chain'),
      getNativeBalance: jest.fn(),
      parseMessages: jest.fn(),
      describeMessages: jest.fn(),
      estimateFee: jest.fn(),
      signTransaction: jest.fn(),
      broadcastTransaction: jest.fn(),
      getTransactionStatus: jest.fn(async () => 'pending'),
    },
    assets: {
      family,
      getCuratedTokens: jest.fn(async (): Promise<Token[]> => []),
      findToken: jest.fn(async (): Promise<Token | null> => null),
      searchRegistry: jest.fn(),
      discoverHeldTokens: jest.fn(async (): Promise<Token[]> => []),
      getBalances: jest.fn(async () => ({})),
      buildTransferMessages: jest.fn(),
    },
    nfts: {
      family,
      getCollections: jest.fn(),
      getItems: jest.fn(),
      getTokenUri: jest.fn(),
      getMetadata: jest.fn(),
      buildTransferMessages: jest.fn(() => [{ type: 'nft-transfer' }]),
    },
    history: {
      family,
      isSupported: jest.fn(() => true),
      getActivities: jest.fn(),
    },
  };

  return module;
};

export type FakeChainModule = ReturnType<typeof createFakeChainModule>;

export const createFakeRegistry = (families: ChainFamily[] = [ChainFamily.GNO, ChainFamily.COSMOS]) => {
  const modules = Object.fromEntries(families.map(family => [family, createFakeChainModule(family)])) as Record<ChainFamily, FakeChainModule>;
  const registry = new ChainRegistry(Object.values(modules) as unknown as ChainModule[]);

  return { registry, modules };
};

// Returns whatever `run` throws or rejects with (undefined when it succeeds).
export const catchError = async (run: () => unknown): Promise<unknown> => {
  try {
    await run();
  }
  catch (error) {
    return error;
  }

  return undefined;
};
