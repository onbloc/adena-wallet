import { ChainFamily, Network } from '../../../domain/network';
import { Token } from '../../../domain/token';
import { CosmosLcdClient } from '../../../infrastructure/http/cosmos-lcd.client';
import { getDefaultTokensFor } from '../../../resources';
import { AssetRepository, RegistryPage, TransferParams } from '../asset-repository';
import { COSMOS_MSG_SEND_AMINO_TYPE, CosmosMessage } from './cosmos-messages';

// AtomOne exposes its bundled coins (ATONE, PHOTON); there is no token registry to search.
export class CosmosAssetRepository implements AssetRepository<CosmosMessage> {
  readonly family = ChainFamily.COSMOS;

  constructor(private readonly lcd: CosmosLcdClient) {}

  async getCuratedTokens(network: Network): Promise<Token[]> {
    return getDefaultTokensFor(network);
  }

  async findToken(tokenId: string, network: Network): Promise<Token | null> {
    return getDefaultTokensFor(network).find(token => token.id === tokenId) ?? null;
  }

  // Bank denoms carry no on-chain metadata, so the bundled coins are the chain's.
  async findChainToken(tokenId: string, network: Network): Promise<Token | null> {
    return this.findToken(tokenId, network);
  }

  async searchRegistry(): Promise<RegistryPage> {
    return { tokens: [], total: 0 };
  }

  async discoverHeldTokens(): Promise<Token[]> {
    return [];
  }

  // A denom missing from the response is an actual zero balance.
  async getBalances(address: string, tokens: Token[], network: Network): Promise<Record<string, string>> {
    const balances = await this.lcd.getBalances(network.restUrl ?? '', address);

    return Object.fromEntries(tokens.map(token => [token.id, balances.find(coin => coin.denom === token.denom)?.amount ?? '0']));
  }

  async buildTransferMessages({ fromAddress, toAddress, token, amount }: TransferParams): Promise<CosmosMessage[]> {
    return [{
      type: COSMOS_MSG_SEND_AMINO_TYPE,
      value: { from_address: fromAddress, to_address: toAddress, amount: [{ denom: token.denom ?? token.id, amount }] },
    }];
  }
}
