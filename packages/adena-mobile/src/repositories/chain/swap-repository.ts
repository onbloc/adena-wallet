import { Network } from '../../domain/network';
import { SwapApproveRoute, SwapQuoteSource, SwapRoute, SwapToken, SwapType } from '../../domain/swap';
import { Token } from '../../domain/token';
import { DexApiConfig } from '../../resources';

export interface SwapRouteCandidate {
  routes: SwapRoute[];
  source: SwapQuoteSource;
}

export interface SwapRouteRequest {
  inputPath: string;
  outputPath: string;
  exactType: SwapType;
  // Raw amount of the exact side (input for EXACT_IN, output for EXACT_OUT).
  amount: string;
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
  exactType: SwapType;
  // EXACT_IN: exact input. EXACT_OUT: amountInMax.
  amountIn: string;
  // EXACT_OUT: exact output.
  amountOut?: string;
  minAmountOut: string;
  routeArr: string;
  quoteArr: string;
  deadline: number;
  // Resolved once by getApproveRoute so prepare and submit sign the same approve form.
  approveRoute: SwapApproveRoute | null;
}

// DEX access for one chain family: token list, route candidates, read-only router quotes and swap messages.
export interface SwapRepository<TMessage = unknown> {
  getTokens(network: Network, config: DexApiConfig): Promise<SwapToken[]>;
  // Candidates in preference order: the route API first, pool-derived paths as a fallback.
  findRouteCandidates(network: Network, config: DexApiConfig, request: SwapRouteRequest): Promise<SwapRouteCandidate[]>;
  // Executes DrySwapRoute on the router; rejects with the router's message when the route fails.
  drySwap(network: Network, config: DexApiConfig, request: DrySwapRequest): Promise<{ amountIn: string; amountOut: string }>;
  getRouterFeeBps(network: Network, config: DexApiConfig): Promise<number>;
  // Null when the input has no curated approve route or the curated list is unavailable.
  getApproveRoute(network: Network, input: Token): Promise<SwapApproveRoute | null>;
  buildSwapMessages(request: SwapMessagesRequest): Promise<TMessage[]>;
  // One entry per message naming what it executes, ignoring the deadline.
  messageTargets(messages: TMessage[]): string[];
}
