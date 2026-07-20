import ATOMONE_CHAIN_DATA from '@resources/chains/atomone-chains.json';
import {
  AtomoneMetainfoItem,
  AtomoneMetainfoResponse,
  AtomoneNetworkMetainfoMapper,
} from './atomone-network-metainfo-mapper';

const MAINNET_ITEM: AtomoneMetainfoItem = {
  id: 'atomone-1',
  default: true,
  main: true,
  chainGroup: 'atomone',
  chainType: 'cosmos',
  chainId: 'atomone-1',
  chainName: 'AtomOne',
  networkId: 'atomone-1',
  networkName: 'Mainnet',
  addressPrefix: 'atone',
  rpcUrl: 'https://atomone-rpc.example.invalid',
  apiUrl: 'https://atomone-api.example.invalid',
  linkUrl: 'https://www.mintscan.io/atomone',
};

describe('AtomoneNetworkMetainfoMapper', () => {
  it('maps the resource main field onto isMainnet', () => {
    const [mainnet] = AtomoneNetworkMetainfoMapper.fromResponse([MAINNET_ITEM]);
    expect(mainnet.isMainnet).toBe(true);

    const [testnet] = AtomoneNetworkMetainfoMapper.fromResponse([
      { ...MAINNET_ITEM, main: false },
    ]);
    expect(testnet.isMainnet).toBe(false);
  });

  it('maps the resource apiUrl field onto restUrl', () => {
    const [metainfo] = AtomoneNetworkMetainfoMapper.fromResponse([MAINNET_ITEM]);
    expect(metainfo.restUrl).toBe('https://atomone-api.example.invalid');
  });

  it('carries the remaining fields through and marks the network as not deleted', () => {
    const [metainfo] = AtomoneNetworkMetainfoMapper.fromResponse([MAINNET_ITEM]);

    expect(metainfo).toEqual({
      id: 'atomone-1',
      default: true,
      isMainnet: true,
      chainGroup: 'atomone',
      chainType: 'cosmos',
      chainId: 'atomone-1',
      chainName: 'AtomOne',
      networkId: 'atomone-1',
      networkName: 'Mainnet',
      addressPrefix: 'atone',
      rpcUrl: 'https://atomone-rpc.example.invalid',
      restUrl: 'https://atomone-api.example.invalid',
      linkUrl: 'https://www.mintscan.io/atomone',
      deleted: false,
    });
  });

  // The atomone-chains.json resource is fetched at runtime rather than
  // imported, so a field rename there cannot be caught by the compiler.
  // Mapping the real resource keeps the two shapes pinned together.
  it('maps every entry of the shipped atomone-chains.json resource', () => {
    const metainfos = AtomoneNetworkMetainfoMapper.fromResponse(
      ATOMONE_CHAIN_DATA as AtomoneMetainfoResponse,
    );

    expect(metainfos).toHaveLength(ATOMONE_CHAIN_DATA.length);
    for (const metainfo of metainfos) {
      expect(typeof metainfo.isMainnet).toBe('boolean');
      expect(metainfo.restUrl).toBeTruthy();
      expect(metainfo.rpcUrl).toBeTruthy();
    }
  });
});
