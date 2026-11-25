import { ChainFamily, Network } from '../../../src/domain/network';
import { accountExplorerUrl, explorerName, tokenExplorerUrl, transactionExplorerUrl } from '../../../src/utils/explorer';

const token = { id: 'ugnot', symbol: 'GNOT', denom: 'ugnot', decimals: 6 };

const network = (overrides: Partial<Network> = {}): Network => ({
  id: 'gno-test',
  family: ChainFamily.GNO,
  chainId: 'test 13',
  chainName: 'Gno.land',
  networkName: 'Testnet',
  addressPrefix: 'g',
  rpcUrl: 'https://rpc.example.com:443?x=1',
  nativeToken: token,
  feeToken: token,
  defaultTokenIds: ['ugnot'],
  isMainnet: false,
  isCustom: false,
  ...overrides,
});

describe('transactionExplorerUrl', () => {
  it('uses the chain id for official gno networks', () => {
    expect(transactionExplorerUrl(network({ apiUrl: 'https://api', linkUrl: 'https://scan.test' }), 'ab/c='))
      .toBe('https://scan.test/transactions/details?chainId=test%2013&txhash=ab%2Fc%3D');
  });

  it('falls back to gnoscan and the rpc url for custom gno networks', () => {
    expect(transactionExplorerUrl(network(), 'h'))
      .toBe('https://gnoscan.io/transactions/details?type=custom&rpcUrl=https%3A%2F%2Frpc.example.com%3A443%3Fx%3D1&txhash=h');
  });

  it('links cosmos networks only when an explorer is configured', () => {
    expect(transactionExplorerUrl(network({ family: ChainFamily.COSMOS, linkUrl: 'https://mintscan.io/atone' }), 'H'))
      .toBe('https://mintscan.io/atone/tx/H');
    expect(transactionExplorerUrl(network({ family: ChainFamily.COSMOS }), 'H')).toBeNull();
  });
});

describe('accountExplorerUrl', () => {
  it('builds gno account links', () => {
    expect(accountExplorerUrl(network({ apiUrl: 'https://api' }), 'g1abc')).toBe('https://gnoscan.io/account/g1abc?chainId=test%2013');
  });

  it('builds cosmos account links when configured', () => {
    expect(accountExplorerUrl(network({ family: ChainFamily.COSMOS, linkUrl: 'https://x' }), 'atone1')).toBe('https://x/address/atone1');
    expect(accountExplorerUrl(network({ family: ChainFamily.COSMOS }), 'atone1')).toBeNull();
  });
});

describe('tokenExplorerUrl', () => {
  it('only links gno tokens', () => {
    expect(tokenExplorerUrl(network({ apiUrl: 'https://api' }), 'gno.land/r/foo')).toBe('https://gnoscan.io/tokens/gno.land/r/foo?chainId=test%2013');
    expect(tokenExplorerUrl(network({ family: ChainFamily.COSMOS, linkUrl: 'https://x' }), 'uatone')).toBeNull();
  });
});

describe('explorerName', () => {
  it('names Gnoscan for Gno and the configured explorer for Cosmos networks', () => {
    expect(explorerName(network())).toBe('Gnoscan');
    expect(explorerName(network({ family: ChainFamily.COSMOS, linkUrl: 'https://www.mintscan.io/atomone' }))).toBe('Mintscan');
    expect(explorerName(network({ family: ChainFamily.COSMOS, linkUrl: 'https://explorer.example' }))).toBe('explorer');
    expect(explorerName(network({ family: ChainFamily.COSMOS, linkUrl: 'https://mintscan.io.evil.example' }))).toBe('explorer');
  });
});
