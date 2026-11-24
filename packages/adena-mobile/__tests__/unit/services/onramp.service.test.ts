import { OnrampConfig, OnrampProvider } from '../../../src/resources';
import { OnrampService } from '../../../src/services/onramp.service';
import { GNO_NETWORK } from '../../helpers/service-fakes';

const provider = (overrides: Partial<OnrampProvider> = {}): OnrampProvider => ({
  id: 'fixture',
  name: 'Fixture Pay',
  paymentMethods: ['Debit card'],
  urlTemplate: 'https://buy.example/?wallet={address}&amount={amount}&fiat={currency}&asset={asset}',
  assets: { [`${GNO_NETWORK.id}:ugnot`]: 'GNOT_GNO' },
  ...overrides,
});

const service = (config: OnrampConfig = { providers: [provider(), provider({ id: 'other', assets: {} })] }) => new OnrampService(config);

describe('OnrampService', () => {
  it('lists only providers that support the network token', () => {
    expect(service().getProviders(GNO_NETWORK, 'ugnot').map(item => item.id)).toEqual(['fixture']);
    expect(service().isSupported(GNO_NETWORK, 'ugnot')).toBe(true);
    expect(service().isSupported(GNO_NETWORK, 'gno.land/r/demo/foo.FOO')).toBe(false);
    expect(service({ providers: [] }).getProviders(GNO_NETWORK, 'ugnot')).toEqual([]);
  });

  it('fills every placeholder with URL-encoded values', () => {
    const url = service({ providers: [provider({ assets: { [`${GNO_NETWORK.id}:ugnot`]: 'GNOT&x=1' } })] })
      .buildUrl('fixture', { network: GNO_NETWORK, tokenId: 'ugnot', address: 'g1abc def', amount: '12.5' });

    expect(url).toBe('https://buy.example/?wallet=g1abc%20def&amount=12.5&fiat=USD&asset=GNOT%26x%3D1');
  });

  it('rejects unknown providers and unsupported tokens', () => {
    const order = { network: GNO_NETWORK, tokenId: 'ugnot', address: 'g1', amount: '1' };

    expect(() => service().buildUrl('missing', order)).toThrow('Provider missing does not support this token');
    expect(() => service().buildUrl('other', order)).toThrow('Provider other does not support this token');
  });

  it('defaults to the bundled, still empty provider list', () => {
    expect(new OnrampService().getProviders(GNO_NETWORK, 'ugnot')).toEqual([]);
  });
});
