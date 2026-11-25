import { TM2Error } from '@gnolang/tm2-js-client';

import { AppError, AppErrorCode } from '../../../core/errors';
import { Network } from '../../../domain/network';
import { MAX_INT64, SwapApproveRoute, SwapQuoteSource, SwapToken, SwapType } from '../../../domain/swap';
import { Token, TokenType } from '../../../domain/token';
import { GnoswapApiClient } from '../../../infrastructure/http/gnoswap-api.client';
import { DexApiConfig, DexSwapConfig, getGrc20RegistryConfig } from '../../../resources';
import { DrySwapRequest, SwapMessagesRequest, SwapRepository, SwapRouteCandidate, SwapRouteRequest } from '../swap-repository';
import { GnoMessage } from './gno-messages';
import { GnoProviderFactory } from './gno-provider';
import { gnoLiteral } from './gno-qeval';
import { buildSwapMessages, swapMessageTargets } from './gno-swap-messages';
import { buildPoolCandidates, parseDrySwapResult, parsePools, parseRouteResponse, parseSwapFee, parseSwapPrices, parseSwapTokens, SwapDataError } from './gno-swap-parsers';
import { GnoTokenResourceRepository } from './gno-token-resource.repository';

const TOKENS_TTL_MS = 5 * 60_000;
const FEE_TTL_MS = 10 * 60_000;

const swapConfigOf = (config: DexApiConfig): DexSwapConfig => {
  if (!config.swap) {
    throw new AppError(AppErrorCode.UNSUPPORTED_NETWORK, 'Swap is not available on this network');
  }

  return config.swap;
};

// GnoSwap on Gno chains: REST API for discovery, the router realm (vm/qeval) for every amount that gets signed.
export class GnoSwapRepository implements SwapRepository<GnoMessage> {
  private readonly tokens = new Map<string, { at: number; value: Promise<SwapToken[]> }>();
  private readonly fees = new Map<string, { at: number; value: Promise<number> }>();

  constructor(
    private readonly providerFactory: GnoProviderFactory,
    private readonly api: GnoswapApiClient,
    private readonly tokenResources: GnoTokenResourceRepository,
    private readonly now: () => number = Date.now,
  ) {}

  getTokens(network: Network, config: DexApiConfig): Promise<SwapToken[]> {
    const swap = swapConfigOf(config);
    const cached = this.tokens.get(network.id);

    if (cached && this.now() - cached.at < TOKENS_TTL_MS) {
      return cached.value;
    }

    const value = Promise.all([
      this.api.getTokenMetas(config.apiUrl),
      this.api.getTokenPriceList(config.apiUrl).catch(() => []),
    ]).then(([metas, prices]) => parseSwapTokens(metas, parseSwapPrices(prices), network, swap));

    value.catch(() => this.tokens.delete(network.id));
    this.tokens.set(network.id, { at: this.now(), value });
    return value;
  }

  async findRouteCandidates(_network: Network, config: DexApiConfig, request: SwapRouteRequest): Promise<SwapRouteCandidate[]> {
    const swap = swapConfigOf(config);
    const { inputPath, outputPath, exactType, amount } = request;
    const fromApi = await this.api.getRoute(config.apiUrl, { inputTokenPath: inputPath, outputTokenPath: outputPath, exactType, amount })
      .then(raw => parseRouteResponse(raw, inputPath, outputPath, swap.feeTiers))
      .catch(() => null);
    const candidates: SwapRouteCandidate[] = fromApi?.length ? [{ routes: fromApi, source: SwapQuoteSource.ROUTER_API }] : [];

    // An answered "no route" is trusted; only an unavailable or malformed API falls back to the pool list.
    if (fromApi === null) {
      const pools = await this.api.getPools(config.apiUrl).then(raw => parsePools(raw, swap.feeTiers)).catch(() => null);

      // Neither source answered, so this is an outage rather than a missing route.
      if (pools === null) {
        throw new AppError(AppErrorCode.SWAP_QUOTE_FAILED, 'Couldn’t get a quote. Check your connection and try again.');
      }

      candidates.push(...buildPoolCandidates(pools, inputPath, outputPath).map(route => ({ routes: [route], source: SwapQuoteSource.POOLS })));
    }

    return candidates;
  }

  async drySwap(network: Network, config: DexApiConfig, request: DrySwapRequest): Promise<{ amountIn: string; amountOut: string }> {
    const swap = swapConfigOf(config);
    // The limit is checked by the router; quotes run unbounded (0 min out, int64 max in) and the app applies slippage.
    const limit = request.exactType === SwapType.EXACT_OUT ? MAX_INT64.toString() : '0';
    const args = [request.inputPath, request.outputPath, request.amount, request.exactType, request.routeArr, request.quoteArr, limit].map(gnoLiteral).join(', ');
    const provider = await this.providerFactory(network.rpcUrl);

    // A VM error (e.g. a panic) is the router refusing the route, unlike a transport failure.
    const raw = await provider.evaluateExpression(swap.routerPath, `DrySwapRoute(${args})`).catch((error: unknown) => {
      throw error instanceof TM2Error ? new SwapDataError(error.log || error.message) : error;
    });

    return parseDrySwapResult(raw);
  }

  getRouterFeeBps(network: Network, config: DexApiConfig): Promise<number> {
    const swap = swapConfigOf(config);
    const cached = this.fees.get(network.id);

    if (cached && this.now() - cached.at < FEE_TTL_MS) {
      return cached.value;
    }

    const value = this.providerFactory(network.rpcUrl)
      .then(provider => provider.evaluateExpression(swap.routerPath, 'GetSwapFee()'))
      .then(parseSwapFee);

    value.catch(() => this.fees.delete(network.id));
    this.fees.set(network.id, { at: this.now(), value });
    return value;
  }

  async getApproveRoute(network: Network, input: Token): Promise<SwapApproveRoute | null> {
    if (input.type !== TokenType.GRC20) {
      return null;
    }

    const list = await this.tokenResources.get(network).catch(() => null);

    return list?.routes[input.id]?.approve ?? null;
  }

  async buildSwapMessages(request: SwapMessagesRequest): Promise<GnoMessage[]> {
    const swap = swapConfigOf(request.config);

    return buildSwapMessages({
      caller: request.caller,
      config: swap,
      registry: getGrc20RegistryConfig(request.network.chainId),
      input: {
        native: request.input.type === TokenType.NATIVE,
        swapPath: request.inputPath,
        approveRoute: request.input.type === TokenType.GRC20 ? request.approveRoute ?? undefined : undefined,
      },
      output: { native: request.output.type === TokenType.NATIVE, swapPath: request.outputPath },
      exactType: request.exactType,
      amountIn: request.amountIn,
      amountOut: request.amountOut,
      minAmountOut: request.minAmountOut,
      routeArr: request.routeArr,
      quoteArr: request.quoteArr,
      deadline: request.deadline,
    });
  }

  messageTargets(messages: GnoMessage[]): string[] {
    return swapMessageTargets(messages);
  }
}
