import { fromBase64 } from '@cosmjs/encoding';

import { ChainFamily, Network } from '../../../domain/network';
import { Token, TokenType } from '../../../domain/token';
import { OnblocApiClient } from '../../../infrastructure/http/onbloc-api.client';
import { getGrc20RegistryConfig, getNativeTokenFor } from '../../../resources';
import { parseCoin } from '../../../utils/amount';
import { AssetRepository, RegistryPage, TransferParams } from '../asset-repository';
import { GnoGrc20Registry } from './gno-grc20-registry';
import { buildGrc20TransferMessage } from './gno-grc20-transfer';
import { GnoMessage, GnoMessageType } from './gno-messages';
import { GnoProviderFactory } from './gno-provider';
import { parseRegistryKey, stripTokenSequence } from './gno-token-key';
import { GnoTokenResourceRepository } from './gno-token-resource.repository';

// Curated resource metadata (name, image, links) wins over bare on-chain metadata.
const overlay = (token: Token, curated: Token[]): Token => {
  const match = curated.find(item => item.id === token.id);

  return match ? { ...token, ...match } : token;
};

export class GnoAssetRepository implements AssetRepository<GnoMessage> {
  readonly family = ChainFamily.GNO;

  constructor(
    private readonly providerFactory: GnoProviderFactory,
    private readonly tokenResources: GnoTokenResourceRepository,
    private readonly registry: GnoGrc20Registry,
    private readonly api: OnblocApiClient,
  ) {}

  async getCuratedTokens(network: Network): Promise<Token[]> {
    return (await this.tokenResources.get(network)).tokens;
  }

  async findToken(tokenId: string, network: Network): Promise<Token | null> {
    const native = getNativeTokenFor(network);

    if (tokenId === native.id) {
      return native;
    }

    if (!parseRegistryKey(tokenId)) {
      return null;
    }

    const [onChain] = await this.registry.getTokens(network, [tokenId]);

    return onChain ? overlay(onChain, await this.getCuratedTokens(network)) : null;
  }

  async searchRegistry(network: Network, offset: number, limit: number): Promise<RegistryPage> {
    const { keys, total } = await this.registry.listKeys(network, offset, limit);
    const curated = await this.getCuratedTokens(network);
    const tokens = await this.registry.getTokens(network, keys);

    return { tokens: tokens.map(token => overlay(token, curated)), total };
  }

  // Held GRC20 tokens come from the account API; networks without an API discover nothing.
  async discoverHeldTokens(address: string, network: Network): Promise<Token[]> {
    if (!network.apiUrl) {
      return [];
    }

    const [assets, curated] = await Promise.all([
      this.api.getAccountAssets(network.apiUrl, address),
      this.getCuratedTokens(network),
    ]);

    return assets
      .filter(asset => asset.tokenType.toUpperCase() === 'GRC20')
      .map((asset): Token | null => {
        const id = asset.tokenKey ?? stripTokenSequence(asset.tokenId);
        const parsed = parseRegistryKey(id);

        if (!parsed) {
          return null;
        }

        return overlay({
          id,
          networkId: network.id,
          family: ChainFamily.GNO,
          type: TokenType.GRC20,
          name: asset.name,
          symbol: asset.symbol,
          decimals: asset.decimals,
          pkgPath: asset.packagePath || parsed.pkgPath,
          imageUrl: asset.logoUrl ?? undefined,
          isNative: false,
        }, curated);
      })
      .filter((token): token is Token => token !== null);
  }

  async getBalances(address: string, tokens: Token[], network: Network): Promise<Record<string, string>> {
    const balances: Record<string, string> = {};
    const natives = tokens.filter(token => token.type === TokenType.NATIVE);
    const grc20Keys = tokens.filter(token => token.type === TokenType.GRC20).map(token => token.id);

    if (natives.length > 0) {
      const provider = await this.providerFactory(network.rpcUrl);
      const response = await provider.abciQuery({ path: `bank/balances/${address}`, data: new Uint8Array(), height: 0, prove: false });
      const data = response.response.ResponseBase.Data;
      const text = data ? new TextDecoder().decode(fromBase64(data)) : '""';
      let coins = text;

      try {
        coins = JSON.parse(text);
      }
      catch {
        // Older nodes return the bare coin string.
      }

      const parsed = String(coins).split(',').map(parseCoin);

      natives.forEach((token) => {
        balances[token.id] = parsed.find(coin => coin?.denom === token.denom)?.amount ?? '0';
      });
    }

    if (grc20Keys.length > 0) {
      const grc20 = await this.registry.getBalances(network, address, grc20Keys);

      grc20Keys.forEach((key) => {
        balances[key] = grc20[key] ?? '0';
      });
    }

    return balances;
  }

  async buildTransferMessages({ network, fromAddress, toAddress, token, amount }: TransferParams): Promise<GnoMessage[]> {
    if (token.type === TokenType.NATIVE) {
      return [{
        type: GnoMessageType.BANK_MSG_SEND,
        value: { from_address: fromAddress, to_address: toAddress, amount: `${amount}${token.denom}` },
      }];
    }

    const { routes } = await this.tokenResources.get(network).catch(() => ({ routes: {} as Record<string, never> }));

    return [buildGrc20TransferMessage({
      caller: fromAddress,
      registryKey: token.id,
      pkgPath: token.pkgPath ?? parseRegistryKey(token.id)?.pkgPath ?? '',
      toAddress,
      amount,
      route: routes[token.id]?.transfer,
      config: getGrc20RegistryConfig(network.chainId),
    })];
  }
}
