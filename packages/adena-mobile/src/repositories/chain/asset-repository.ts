import { ChainFamily, Network } from '../../domain/network';
import { Token } from '../../domain/token';

export interface TransferParams {
  network: Network;
  fromAddress: string;
  toAddress: string;
  token: Token;
  // Raw integer amount in the token's smallest unit.
  amount: string;
}

export interface RegistryPage {
  tokens: Token[];
  total: number;
}

// Token metadata, discovery, balances and transfer construction for one chain family.
export interface AssetRepository<TMessage = unknown> {
  readonly family: ChainFamily;
  getCuratedTokens(network: Network): Promise<Token[]>;
  findToken(tokenId: string, network: Network): Promise<Token | null>;
  searchRegistry(network: Network, offset: number, limit: number): Promise<RegistryPage>;
  discoverHeldTokens(address: string, network: Network): Promise<Token[]>;
  // Raw balances keyed by token id; tokens missing from the result are unknown.
  getBalances(address: string, tokens: Token[], network: Network): Promise<Record<string, string>>;
  buildTransferMessages(params: TransferParams): Promise<TMessage[]>;
}
