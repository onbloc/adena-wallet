import { Network } from '../../domain/network';
import { SwapQuoteSource, SwapRoute, SwapToken } from '../../domain/swap';
import { Token } from '../../domain/token';
import { DexApiConfig } from '../../resources';

export interface SwapRouteCandidate {
  routes: SwapRoute[];
  source: SwapQuoteSource;
}

export interface SwapRouteRequest {
  inputPath: string;
  outputPath: string;
  // Raw exact-in amount.
  amountIn: string;
}

export interface DrySwapRequest extends SwapRouteRequest {
  routeArr: string;
  quoteArr: string;
}

export interface SwapMessagesRequest {
  network: Network;
  config: DexApiConfig;
  caller: string;
  input: Token;
  output: Token;
  inputPath: string;
  outputPath: string;
  amountIn: string;
  minAmountOut: string;
  routeArr: string;
  quoteArr: string;
  deadline: number;
}

// DEX access for one chain family: token list, route candidates, read-only router quotes and swap messages.
export interface SwapRepository<TMessage = unknown> {
  getTokens(network: Network, config: DexApiConfig): Promise<SwapToken[]>;
  // Candidates in preference order: the route API first, pool-derived paths as a fallback.
  findRouteCandidates(network: Network, config: DexApiConfig, request: SwapRouteRequest): Promise<SwapRouteCandidate[]>;
  // Executes DrySwapRoute on the router; rejects with the router's message when the route fails.
  drySwap(network: Network, config: DexApiConfig, request: DrySwapRequest): Promise<{ amountIn: string; amountOut: string }>;
  getRouterFeeBps(network: Network, config: DexApiConfig): Promise<number>;
  buildSwapMessages(request: SwapMessagesRequest): Promise<TMessage[]>;
}
