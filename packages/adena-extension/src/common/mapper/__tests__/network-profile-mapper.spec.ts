import { AtomoneNetworkMetainfo, NetworkMetainfo } from '@types';
import {
  toCosmosNetworkProfile,
  toGnoNetworkProfile,
} from '../network-profile-mapper';

describe('toGnoNetworkProfile', () => {
  it('maps mainnet metainfo with all Gno-specific fields', () => {
    const metainfo: NetworkMetainfo = {
      id: 'gnoland1',
      default: true,
      main: true,
      chainId: 'gnoland1',
      chainName: 'Gno.land',
      networkId: 'gnoland1',
      networkName: 'Gno.land',
      addressPrefix: 'g',
      rpcUrl: 'https://rpc.example.com',
      indexerUrl: 'https://indexer.example.com',
      gnoUrl: 'https://gno.example.com',
      apiUrl: 'https://api.example.com',
      linkUrl: 'https://gnoscan.io',
    };

    const profile = toGnoNetworkProfile(metainfo);

    expect(profile).toEqual({
      id: 'gnoland1',
      chainType: 'gno',
      chainGroup: 'gno',
      chainId: 'gnoland1',
      displayName: 'Gno.land',
      chainIconUrl: '/assets/icons/gnoland.svg',
      nativeTokenId: 'gnoland1:ugnot',
      isMainnet: true,
      rpcEndpoints: ['https://rpc.example.com'],
      indexerUrl: 'https://indexer.example.com',
      apiUrl: 'https://api.example.com',
      gnoUrl: 'https://gno.example.com',
      linkUrl: 'https://gnoscan.io',
    });
  });

  it('treats missing optional URL fields as undefined', () => {
    const metainfo: NetworkMetainfo = {
      id: 'dev',
      default: false,
      chainId: 'dev',
      chainName: 'Local',
      networkId: 'dev',
      networkName: 'Local',
      addressPrefix: 'g',
      rpcUrl: 'http://127.0.0.1:26657',
      indexerUrl: '',
      gnoUrl: '',
      apiUrl: '',
      linkUrl: '',
    };

    const profile = toGnoNetworkProfile(metainfo);

    expect(profile.isMainnet).toBe(false);
    expect(profile.indexerUrl).toBeUndefined();
    expect(profile.apiUrl).toBeUndefined();
    expect(profile.gnoUrl).toBeUndefined();
    expect(profile.linkUrl).toBeUndefined();
  });
});

describe('toCosmosNetworkProfile', () => {
  it('maps AtomOne metainfo including REST endpoint and link URL', () => {
    const metainfo: AtomoneNetworkMetainfo = {
      id: 'atomone-1',
      default: true,
      isMainnet: true,
      chainGroup: 'atomone',
      chainType: 'cosmos',
      chainId: 'atomone-1',
      chainName: 'AtomOne',
      networkId: 'atomone-1',
      networkName: 'AtomOne',
      addressPrefix: 'atone',
      rpcUrl: 'https://rpc.example.com',
      restUrl: 'https://rest.example.com',
      linkUrl: 'https://www.mintscan.io/atomone',
    };

    const profile = toCosmosNetworkProfile(metainfo);

    expect(profile).toEqual({
      id: 'atomone-1',
      chainType: 'cosmos',
      chainGroup: 'atomone',
      chainId: 'atomone-1',
      displayName: 'AtomOne',
      chainIconUrl: '/assets/icons/atone.svg',
      nativeTokenId: 'atomone-1:uatone',
      isMainnet: true,
      rpcEndpoints: ['https://rpc.example.com'],
      restEndpoints: ['https://rest.example.com'],
      linkUrl: 'https://www.mintscan.io/atomone',
    });
  });
});
