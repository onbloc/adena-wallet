import { isAppError } from '../../../src/core/errors';
import { ChainFamily } from '../../../src/domain/network';
import { StorageNetworkRepository } from '../../../src/repositories/network.repository';
import { BUILT_IN_NETWORKS, DEFAULT_NETWORK_ID } from '../../../src/resources';
import { NetworkService } from '../../../src/services/network.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { catchError, createFakeRegistry } from '../../helpers/service-fakes';

const setup = (families?: ChainFamily[]) => {
  const { registry, modules } = createFakeRegistry(families);
  const repository = new StorageNetworkRepository(new MemoryKeyValueStore());

  return { service: new NetworkService(repository, registry), repository, modules };
};

const codeOf = async (run: () => unknown) => {
  const error = await catchError(run);

  return isAppError(error) ? error.code : error;
};

describe('NetworkService', () => {
  it('lists the built-in networks of registered families', () => {
    expect(setup().service.getNetworks()).toEqual(BUILT_IN_NETWORKS);
    expect(setup([ChainFamily.GNO]).service.getNetworks().every(network => network.family === 'gno')).toBe(true);
  });

  it('accepts a custom built-in list', () => {
    const { registry } = createFakeRegistry();
    const service = new NetworkService(new StorageNetworkRepository(new MemoryKeyValueStore()), registry, [BUILT_IN_NETWORKS[1]]);

    expect(service.getNetworks()).toEqual([BUILT_IN_NETWORKS[1]]);
    expect(service.getCurrentNetwork()).toEqual(BUILT_IN_NETWORKS[1]);
  });

  it('finds networks by id and chain id', async () => {
    const { service } = setup();

    expect(service.getNetwork('onyx-1').chainId).toBe('onyx-1');
    expect(service.findByChainId('dev.gnoswap')?.id).toBe('gnoswap');
    expect(service.findByChainId('nope')).toBeUndefined();
    expect(await codeOf(() => service.getNetwork('nope'))).toBe('INVALID_REQUEST');
  });

  it('hides networks of unregistered families', async () => {
    const { service } = setup([ChainFamily.GNO]);

    expect(await codeOf(() => service.getNetwork('atomone-1'))).toBe('INVALID_REQUEST');
    expect(service.findByChainId('atomone-1')).toBeUndefined();
  });

  describe('current network', () => {
    it('defaults to the mainnet', () => {
      expect(setup().service.getCurrentNetwork().id).toBe(DEFAULT_NETWORK_ID);
    });

    it('switches to known networks only', async () => {
      const { service, repository } = setup();

      expect(service.selectNetwork('onyx-1').id).toBe('onyx-1');
      expect(service.getCurrentNetwork().id).toBe('onyx-1');
      expect(await codeOf(() => service.selectNetwork('unknown'))).toBe('INVALID_REQUEST');
      expect(repository.getCurrentNetworkId()).toBe('onyx-1');
    });

    it('falls back to the first network when the stored one is gone', () => {
      const { service, repository } = setup();

      repository.setCurrentNetworkId('removed');
      expect(service.getCurrentNetwork()).toEqual(service.getNetworks()[0]);
    });
  });

  describe('addCustomNetwork', () => {
    it('adds a Gno network with the chain id reported by the node', async () => {
      const { service, modules } = setup();

      modules.gno.chain.getChainId.mockResolvedValue('local-dev');
      const network = await service.addCustomNetwork({ networkName: '  Local  ', rpcUrl: ' http://localhost:26657/// ', baseNetworkId: 'gnoland-1' });

      expect(network).toMatchObject({
        id: 'custom:local-dev:http://localhost:26657',
        chainId: 'local-dev',
        family: 'gno',
        networkName: 'Local',
        rpcUrl: 'http://localhost:26657',
        isCustom: true,
        isMainnet: false,
        addressPrefix: 'g',
      });
      expect(network.restUrl).toBeUndefined();
      expect(network.apiUrl).toBeUndefined();
      expect(network.linkUrl).toBeUndefined();
      expect(network.fallbackRpcUrl).toBeUndefined();
      expect(modules.gno.chain.getChainId).toHaveBeenCalledWith(expect.objectContaining({ id: '', rpcUrl: 'http://localhost:26657' }));
      expect(service.getNetwork(network.id)).toEqual(network);
      expect(service.findByChainId('local-dev')).toEqual(network);
    });

    it('uses the URL as the LCD endpoint for Cosmos networks', async () => {
      const { service, modules } = setup();

      modules.cosmos.chain.getChainId.mockResolvedValue('atomone-local');
      const network = await service.addCustomNetwork({ networkName: 'Local', rpcUrl: 'https://lcd.example', baseNetworkId: 'atomone-1' });

      expect(network).toMatchObject({ family: 'cosmos', restUrl: 'https://lcd.example', feeToken: { denom: 'uphoton' } });
    });

    it.each(['ws://node', 'node.example', ''])('rejects the URL %p', async (rpcUrl) => {
      const { service, modules } = setup();

      expect(await codeOf(() => service.addCustomNetwork({ networkName: 'x', rpcUrl, baseNetworkId: 'gnoland-1' }))).toBe('INVALID_REQUEST');
      expect(modules.gno.chain.getChainId).not.toHaveBeenCalled();
    });

    it.each(['http://node.example.com', 'http://8.8.8.8:26657', 'http://172.32.0.1', 'HTTP://rpc.gno.land', 'http://[2001:db8::1]:26657'])('rejects public cleartext URL %p', async (rpcUrl) => {
      const { service, modules } = setup();
      const error = await catchError(() => service.addCustomNetwork({ networkName: 'x', rpcUrl, baseNetworkId: 'gnoland-1' }));

      expect(error).toMatchObject({ code: 'INVALID_REQUEST', message: expect.stringMatching(/^Use an https:\/\/ URL/) });
      expect(modules.gno.chain.getChainId).not.toHaveBeenCalled();
    });

    it.each([
      'http://localhost:26657', 'http://127.0.0.1:26657', 'http://10.0.2.2:26657', 'http://192.168.1.20:26657',
      'http://172.16.0.5', 'http://gnodev.local:26657', 'http://devbox:26657', 'http://[::1]:26657',
    ])('allows local cleartext URL %p for development', async (rpcUrl) => {
      const { service } = setup();

      await expect(service.addCustomNetwork({ networkName: 'x', rpcUrl, baseNetworkId: 'gnoland-1' })).resolves.toMatchObject({ rpcUrl });
    });

    it('rejects an unknown base network', async () => {
      expect(await codeOf(() => setup().service.addCustomNetwork({ networkName: 'x', rpcUrl: 'https://n', baseNetworkId: 'nope' }))).toBe('INVALID_REQUEST');
    });

    it('rejects the same chain and URL twice', async () => {
      const { service } = setup();
      const input = { networkName: 'Local', rpcUrl: 'https://node.example', baseNetworkId: 'gnoland-1' };

      await service.addCustomNetwork(input);
      await expect(catchError(() => service.addCustomNetwork({ ...input, rpcUrl: 'https://node.example/' }))).resolves.toThrow('This network is already added');
      expect(service.getNetworks().filter(network => network.isCustom)).toHaveLength(1);
    });

    it('stores nothing when the node is unreachable', async () => {
      const { service, modules } = setup();

      modules.gno.chain.getChainId.mockRejectedValue(new Error('offline'));
      await expect(service.addCustomNetwork({ networkName: 'x', rpcUrl: 'https://n', baseNetworkId: 'gnoland-1' })).rejects.toThrow('offline');
      expect(service.getNetworks()).toHaveLength(BUILT_IN_NETWORKS.length);
    });
  });

  describe('removeCustomNetwork', () => {
    it('returns to the default network when the selected one is removed', async () => {
      const { service } = setup();
      const network = await service.addCustomNetwork({ networkName: 'x', rpcUrl: 'https://n', baseNetworkId: 'onyx-1' });

      service.selectNetwork(network.id);
      service.removeCustomNetwork(network.id);
      expect(service.getCurrentNetwork().id).toBe(DEFAULT_NETWORK_ID);
      expect(service.getNetworks().some(item => item.id === network.id)).toBe(false);
    });

    it('keeps the selection when another network is removed', async () => {
      const { service } = setup();
      const network = await service.addCustomNetwork({ networkName: 'x', rpcUrl: 'https://n', baseNetworkId: 'gnoland-1' });

      service.selectNetwork('onyx-1');
      service.removeCustomNetwork(network.id);
      expect(service.getCurrentNetwork().id).toBe('onyx-1');
    });

    it('cannot remove built-in networks', () => {
      const { service } = setup();

      service.removeCustomNetwork('gnoland-1');
      expect(service.getNetwork('gnoland-1')).toBeDefined();
    });
  });
});
