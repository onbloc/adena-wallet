import { ChainRepository } from '@repositories/common';
import { AtomoneNetworkMetainfo } from '@types';
import { ChainService } from './chain';

describe('ChainService — AtomOne methods', () => {
  let mockAddAtomoneNetwork: jest.Mock;
  let mockDeleteAtomoneNetworks: jest.Mock;
  let mockDeleteNetworks: jest.Mock;
  let mockDeleteCurrentChainId: jest.Mock;
  let mockDeleteCurrentNetworkId: jest.Mock;
  let mockDeleteNetworkMode: jest.Mock;
  let mockDeleteCurrentAtomoneNetworkId: jest.Mock;
  let service: ChainService;

  beforeEach(() => {
    mockAddAtomoneNetwork = jest.fn().mockResolvedValue(true);
    mockDeleteAtomoneNetworks = jest.fn().mockResolvedValue(true);
    mockDeleteNetworks = jest.fn().mockResolvedValue(true);
    mockDeleteCurrentChainId = jest.fn().mockResolvedValue(true);
    mockDeleteCurrentNetworkId = jest.fn().mockResolvedValue(true);
    mockDeleteNetworkMode = jest.fn().mockResolvedValue(true);
    mockDeleteCurrentAtomoneNetworkId = jest.fn().mockResolvedValue(true);

    const repository = {
      addAtomoneNetwork: mockAddAtomoneNetwork,
      deleteAtomoneNetworks: mockDeleteAtomoneNetworks,
      deleteNetworks: mockDeleteNetworks,
      deleteCurrentChainId: mockDeleteCurrentChainId,
      deleteCurrentNetworkId: mockDeleteCurrentNetworkId,
      deleteNetworkMode: mockDeleteNetworkMode,
      deleteCurrentAtomoneNetworkId: mockDeleteCurrentAtomoneNetworkId,
    } as unknown as ChainRepository;

    service = new ChainService(repository);
  });

  describe('addAtomoneNetwork', () => {
    it('assembles a Cosmos-shaped record with isMainnet=false and default=false', async () => {
      await service.addAtomoneNetwork(
        'My Node',
        'http://localhost:26657',
        'http://localhost:1317',
        'atomone-local',
      );

      expect(mockAddAtomoneNetwork).toHaveBeenCalledTimes(1);
      const submitted = mockAddAtomoneNetwork.mock.calls[0][0] as AtomoneNetworkMetainfo;

      expect(submitted).toMatchObject({
        default: false,
        isMainnet: false,
        chainGroup: 'atomone',
        chainType: 'cosmos',
        chainId: 'atomone-local',
        chainName: 'AtomOne',
        networkId: 'atomone-local',
        networkName: 'My Node',
        addressPrefix: 'atone',
        rpcUrl: 'http://localhost:26657',
        restUrl: 'http://localhost:1317',
      });
      expect(submitted.id).toMatch(/^\d+$/);
    });
  });

  describe('clear', () => {
    it('wipes ATOMONE_NETWORKS alongside Gno storage keys', async () => {
      await service.clear();

      expect(mockDeleteCurrentChainId).toHaveBeenCalled();
      expect(mockDeleteNetworks).toHaveBeenCalled();
      expect(mockDeleteAtomoneNetworks).toHaveBeenCalled();
      expect(mockDeleteCurrentNetworkId).toHaveBeenCalled();
      expect(mockDeleteNetworkMode).toHaveBeenCalled();
      expect(mockDeleteCurrentAtomoneNetworkId).toHaveBeenCalled();
    });
  });
});
