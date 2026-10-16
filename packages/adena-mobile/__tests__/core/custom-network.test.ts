import {GnoProvider} from '@common/provider/gno/gno-provider';
import type {NetworkMetainfo} from '@types';

import {
  applyNetworkEdit,
  checkRpcChainId,
  isValidNetworkUrl,
  makeCustomNetwork,
  removeNetwork,
  rpcCheckMessage,
  validateNetworkInput,
} from '../../src/core/custom-network';

const network = (over: Partial<NetworkMetainfo>): NetworkMetainfo => ({
  id: 'test',
  default: true,
  chainId: 'test-1',
  chainName: 'Gno.land',
  networkId: 'test-1',
  networkName: 'Testnet',
  addressPrefix: 'g',
  rpcUrl: 'https://rpc.test.example',
  fallbackRPCUrl: 'https://rpc2.test.example',
  ...over,
});

const networks = [
  network({}),
  network({
    id: 'gone',
    chainId: 'gone-1',
    networkId: 'gone-1',
    rpcUrl: 'https://rpc.gone.example',
    deleted: true,
  }),
];

const input = {
  name: 'My node',
  rpcUrl: 'https://rpc.mine.example/',
  chainId: 'mine-1',
  indexerUrl: '',
};

describe('isValidNetworkUrl', () => {
  it('accepts https URLs with a path', () => {
    expect(isValidNetworkUrl('https://rpc.example.com:443/v1')).toBe(true);
  });

  it.each([
    'http://rpc.example.com',
    'rpc.example.com',
    'https://user@rpc.example.com',
    'https://rpc.example.com/a b',
    'ftp://rpc.example.com',
  ])('rejects %s', url => {
    expect(isValidNetworkUrl(url)).toBe(false);
  });
});

describe('validateNetworkInput', () => {
  it('passes a new network', () => {
    expect(validateNetworkInput(input, networks)).toEqual({});
  });

  it('rejects a chain ID or RPC already in use, ignoring a trailing slash', () => {
    const errors = validateNetworkInput(
      {...input, rpcUrl: 'https://rpc.test.example/', chainId: 'test-1'},
      networks,
    );
    expect(errors.rpcUrl).toBe('RPC URL already in use');
    expect(errors.chainId).toBe('Chain ID already in use');
  });

  it('ignores deleted networks and the one being edited', () => {
    expect(
      validateNetworkInput(
        {...input, rpcUrl: 'https://rpc.gone.example', chainId: 'gone-1'},
        networks,
      ),
    ).toEqual({});
    expect(
      validateNetworkInput(
        {...input, rpcUrl: 'https://rpc.test.example', chainId: 'test-1'},
        networks,
        'test',
      ),
    ).toEqual({});
  });

  it('requires https for the optional indexer', () => {
    expect(
      validateNetworkInput({...input, indexerUrl: 'http://idx.example'}, networks)
        .indexerUrl,
    ).toBe('Enter an https URL');
  });
});

describe('network list changes', () => {
  it('builds a custom network like the extension', () => {
    const added = makeCustomNetwork(input);
    expect(added).toMatchObject({
      default: false,
      chainId: 'mine-1',
      networkId: 'mine-1',
      networkName: 'My node',
      addressPrefix: 'g',
      rpcUrl: 'https://rpc.mine.example',
    });
  });

  it('drops the bundled fallback when the RPC is repointed', () => {
    const origin = network({});
    expect(
      applyNetworkEdit(origin, {...input, rpcUrl: origin.rpcUrl, chainId: 'test-1'})
        .fallbackRPCUrl,
    ).toBe(origin.fallbackRPCUrl);
    expect(applyNetworkEdit(origin, input).fallbackRPCUrl).toBeUndefined();
  });

  it('hides a default network and removes a custom one', () => {
    const custom = makeCustomNetwork(input);
    const list = [network({}), custom];
    expect(removeNetwork(list, 'test')[0].deleted).toBe(true);
    expect(removeNetwork(list, custom.id)).toHaveLength(1);
  });
});

describe('checkRpcChainId', () => {
  afterEach(() => jest.restoreAllMocks());

  const status = (chain: string) =>
    jest
      .spyOn(GnoProvider.prototype, 'getStatus')
      .mockResolvedValue({node_info: {network: chain}} as never);

  it('accepts a node that serves the entered chain', async () => {
    status('mine-1');
    expect(await checkRpcChainId(input.rpcUrl, 'mine-1')).toEqual({ok: true});
  });

  it('reports the chain a node actually serves', async () => {
    status('other-1');
    const check = await checkRpcChainId(input.rpcUrl, 'mine-1');
    expect(check).toEqual({ok: false, reason: 'mismatch', reported: 'other-1'});
    expect(rpcCheckMessage(check)).toContain('other-1');
  });

  it('reports a node that cannot be reached', async () => {
    jest
      .spyOn(GnoProvider.prototype, 'getStatus')
      .mockRejectedValue(new Error('network'));
    expect(await checkRpcChainId(input.rpcUrl, 'mine-1')).toEqual({
      ok: false,
      reason: 'unreachable',
    });
  });
});
