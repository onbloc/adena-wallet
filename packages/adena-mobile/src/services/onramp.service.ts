import { Network } from '../domain/network';
import { ONRAMP_CONFIG, OnrampConfig, OnrampPlaceholder, OnrampProvider } from '../resources';

export const ONRAMP_CURRENCY = 'USD';

export const onrampAssetKey = (networkId: string, tokenId: string): string => `${networkId}:${tokenId}`;

export interface OnrampOrder {
  network: Network;
  tokenId: string;
  address: string;
  // Fiat amount as a plain decimal string, e.g. "150" or "12.5".
  amount: string;
}

// Fiat onramp providers from the bundled config; checkout happens on the provider's website.
export class OnrampService {
  constructor(private readonly config: OnrampConfig = ONRAMP_CONFIG) {}

  getProviders(network: Network, tokenId: string): OnrampProvider[] {
    const key = onrampAssetKey(network.id, tokenId);

    return this.config.providers.filter(provider => provider.assets[key] !== undefined);
  }

  isSupported(network: Network, tokenId: string): boolean {
    return this.getProviders(network, tokenId).length > 0;
  }

  buildUrl(providerId: string, order: OnrampOrder): string {
    const provider = this.config.providers.find(item => item.id === providerId);
    const asset = provider?.assets[onrampAssetKey(order.network.id, order.tokenId)];

    if (!provider || asset === undefined) {
      throw new Error(`Provider ${providerId} does not support this token`);
    }

    const values: Record<OnrampPlaceholder, string> = { address: order.address, amount: order.amount, currency: ONRAMP_CURRENCY, asset };

    return provider.urlTemplate.replace(/\{(address|amount|currency|asset)\}/g, (_match, name: OnrampPlaceholder) => encodeURIComponent(values[name]));
  }
}
