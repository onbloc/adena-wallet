import { AppError, AppErrorCode } from '../core/errors';
import { Account } from '../domain/account';
import { FeeEstimate } from '../domain/fee';
import { Network } from '../domain/network';
import {
  effectiveSlippage,
  encodeRoutes,
  estimatePriceImpact,
  exactOutTarget,
  hopCount,
  isRawAmount,
  slippageToBps,
  SwapApproveRoute,
  swapDeadline,
  swapLimits,
  SwapQuote,
  SwapSettings,
  SwapToken,
  SwapType,
  validateRoutes,
} from '../domain/swap';
import { TokenType } from '../domain/token';
import { BroadcastResult, TransactionDraft, TransactionFee } from '../domain/transaction';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { SwapDataError } from '../repositories/chain/gno/gno-swap-parsers';
import { SwapRepository } from '../repositories/chain/swap-repository';
import { DEX_API_CONFIG, DexApiConfig, DexApiConfigMap, DexSwapConfig, isTokenPath } from '../resources';
import { AccountService } from './account.service';
import { maxFeeReserve, SignAndBroadcastOptions, TransactionService } from './transaction.service';

// A quote older than this is fetched again before it can be reviewed.
export const SWAP_QUOTE_TTL_MS = 60_000;
// An open review can be confirmed this long after prepare; the fresh dry run at submit guards the price.
export const SWAP_REVIEW_TTL_MS = 120_000;

export interface SwapQuoteRequest {
  network: Network;
  input: SwapToken;
  output: SwapToken;
  exactType: SwapType;
  // Raw amount of the exact side.
  amount: string;
}

export interface PrepareSwapInput {
  account: Account;
  network: Network;
  input: SwapToken;
  output: SwapToken;
  quote: SwapQuote;
  settings: SwapSettings;
}

// Everything the review shows and the confirm signs; amounts come from the router dry run, never from the API.
export interface PreparedSwap {
  account: Account;
  network: Network;
  input: SwapToken;
  output: SwapToken;
  quote: SwapQuote;
  slippageBps: number;
  // Wrapped, approved and checked against the balance (EXACT_OUT: amountInMax).
  maxAmountIn: string;
  minAmountOut: string;
  deadlineMinutes: number;
  // Pinned at prepare so the confirm signs the approve form the fee was estimated for.
  approveRoute: SwapApproveRoute | null;
  draft: TransactionDraft;
  estimate: FeeEstimate;
  preparedAt: number;
}

export interface SwapMaxInput {
  account: Account;
  network: Network;
  input: SwapToken;
  // Without an output token no swap tx can be simulated, so the bundled reserve is used.
  output?: SwapToken;
  // Raw balance of `input`.
  balance: string;
  settings: SwapSettings;
}

export interface SwapMaxResult {
  amount: string;
  // True when the fee could not be estimated and the bundled reserve was kept back instead.
  approximate: boolean;
}

type SupportedConfig = DexApiConfig & { swap: DexSwapConfig };

// GnoSwap exact-in and exact-out swaps: route candidates -> router dry run -> wrap/approve/swap/unwrap transaction.
export class SwapService {
  constructor(
    private readonly chainRegistry: ChainRegistry,
    private readonly accountService: AccountService,
    private readonly transactionService: TransactionService,
    private readonly config: DexApiConfigMap = DEX_API_CONFIG,
    private readonly now: () => number = Date.now,
  ) {}

  // Custom networks never inherit a built-in id's contracts.
  private configFor(network: Network): SupportedConfig | undefined {
    const config = this.config[network.id];

    return config?.swap && !network.isCustom && this.chainRegistry.swap(network) ? (config as SupportedConfig) : undefined;
  }

  private require(network: Network): { config: SupportedConfig; repository: SwapRepository } {
    const config = this.configFor(network);
    const repository = this.chainRegistry.swap(network);

    if (!config || !repository) {
      throw new AppError(AppErrorCode.UNSUPPORTED_NETWORK, 'Swap is not available on this network');
    }

    return { config, repository };
  }

  isSupported(network: Network): boolean {
    return this.configFor(network) !== undefined;
  }

  getSwapConfig(network: Network): DexSwapConfig | undefined {
    return this.configFor(network)?.swap;
  }

  async getTokens(network: Network): Promise<SwapToken[]> {
    const { config, repository } = this.require(network);

    return repository.getTokens(network, config);
  }

  getBalances(account: Account, network: Network, tokens: SwapToken[]): Promise<Record<string, string>> {
    const address = this.accountService.getAddress(account, network);

    return this.chainRegistry.assets(network).getBalances(address, tokens, network);
  }

  async getQuote({ network, input, output, exactType, amount }: SwapQuoteRequest): Promise<SwapQuote> {
    const { config, repository } = this.require(network);

    if (input.swapPath === output.swapPath) {
      throw new AppError(AppErrorCode.SWAP_INVALID_TOKEN, 'Choose two different tokens');
    }

    if (!isRawAmount(amount) || BigInt(amount) <= 0n) {
      throw new AppError(AppErrorCode.INVALID_AMOUNT, 'Enter an amount greater than zero');
    }

    if (exactType !== SwapType.EXACT_IN && exactType !== SwapType.EXACT_OUT) {
      throw new AppError(AppErrorCode.INVALID_AMOUNT, 'Unsupported swap type');
    }

    const request = { inputPath: input.swapPath, outputPath: output.swapPath, exactType, amount };
    const [candidates, feeBps] = await Promise.all([
      repository.findRouteCandidates(network, config, request),
      repository.getRouterFeeBps(network, config).catch(() => null),
    ]);
    let transportFailed = false;
    const results = await Promise.all(candidates.map(async (candidate) => {
      let encoded: ReturnType<typeof encodeRoutes>;

      try {
        validateRoutes(candidate.routes, request.inputPath, request.outputPath, config.swap.feeTiers, isTokenPath);
        encoded = encodeRoutes(candidate.routes);
      }
      catch {
        return null;
      }

      try {
        const dry = await repository.drySwap(network, config, { ...request, ...encoded });

        if (!this.fills(exactType, amount, dry, hopCount(candidate.routes))) {
          return null;
        }

        return { candidate, encoded, dry };
      }
      catch (error) {
        // Only the router's own answer refuses the route; timeouts and transport failures say nothing about it.
        if (!(error instanceof SwapDataError)) {
          transportFailed = true;
        }

        return null;
      }
    }));
    // EXACT_IN keeps the largest output, EXACT_OUT the smallest input.
    const better = (next: NonNullable<(typeof results)[number]>, current: NonNullable<(typeof results)[number]>): boolean =>
      exactType === SwapType.EXACT_IN ? BigInt(next.dry.amountOut) > BigInt(current.dry.amountOut) : BigInt(next.dry.amountIn) < BigInt(current.dry.amountIn);
    const best = results.reduce<(typeof results)[number]>((current, next) => (next && (!current || better(next, current)) ? next : current), null);

    if (!best) {
      // No liquidity only when every candidate was refused; any unanswered one leaves a retry.
      throw transportFailed
        ? new AppError(AppErrorCode.SWAP_QUOTE_FAILED, 'Couldn’t get a quote. Check your connection and try again.')
        : new AppError(AppErrorCode.SWAP_NO_ROUTE, 'Not enough liquidity for this swap');
    }

    const routerFeeBps = feeBps ?? 0;

    return {
      exactType,
      requestedAmount: amount,
      networkId: network.id,
      inputTokenId: input.id,
      outputTokenId: output.id,
      inputPath: request.inputPath,
      outputPath: request.outputPath,
      amountIn: best.dry.amountIn,
      amountOut: best.dry.amountOut,
      routes: best.candidate.routes,
      routeArr: best.encoded.routeArr,
      quoteArr: best.encoded.quoteArr,
      routerFeeBps,
      priceImpactPercent: estimatePriceImpact(best.candidate.routes, best.dry.amountIn, best.dry.amountOut, routerFeeBps, exactType),
      source: best.candidate.source,
      quotedAt: this.now(),
    };
  }

  // Exact-in must consume the whole input (a partial fill means no liquidity); exact-out must deliver
  // the target within the router's one-unit-per-hop tolerance.
  private fills(exactType: SwapType, amount: string, dry: { amountIn: string; amountOut: string }, hops: number): boolean {
    if (BigInt(dry.amountIn) <= 0n || BigInt(dry.amountOut) <= 0n) {
      return false;
    }

    if (exactType === SwapType.EXACT_IN) {
      return dry.amountIn === amount;
    }

    const diff = BigInt(dry.amountOut) - BigInt(amount);

    return (diff < 0n ? -diff : diff) <= BigInt(hops);
  }

  // GRC20 decimals from the API must match the raw registry metadata (no curated overlay), whose symbol and
  // name the review then shows. Wrapped GNOT is the registry's wugnot like any GRC20; native GNOT keeps the
  // bundled network metadata because the router trades it 1:1 in raw units as wugnot, so wugnot decimals never apply.
  private async onChainTokens(network: Network, tokens: SwapToken[]): Promise<SwapToken[]> {
    const assets = this.chainRegistry.assets(network);

    return Promise.all(tokens.map(async (token) => {
      if (token.type !== TokenType.GRC20) {
        return token;
      }

      const onChain = await assets.findChainToken(token.id, network);

      if (!onChain || onChain.type !== TokenType.GRC20 || onChain.decimals !== token.decimals) {
        throw new AppError(AppErrorCode.SWAP_INVALID_TOKEN, `${token.symbol} details don’t match the chain. Swap is blocked for this token.`);
      }

      return { ...token, symbol: onChain.symbol, name: onChain.name };
    }));
  }

  private async buildDraft(prepared: Omit<PreparedSwap, 'draft' | 'estimate' | 'preparedAt'>, fee: TransactionFee): Promise<TransactionDraft> {
    const { config, repository } = this.require(prepared.network);
    const { account, network, input, output, quote } = prepared;
    const messages = await repository.buildSwapMessages({
      network,
      config,
      caller: this.accountService.getAddress(account, network),
      input,
      output,
      inputPath: quote.inputPath,
      outputPath: quote.outputPath,
      exactType: quote.exactType,
      amountIn: prepared.maxAmountIn,
      amountOut: quote.exactType === SwapType.EXACT_OUT ? exactOutTarget(quote) : undefined,
      minAmountOut: prepared.minAmountOut,
      routeArr: quote.routeArr,
      quoteArr: quote.quoteArr,
      deadline: swapDeadline(this.now(), prepared.deadlineMinutes),
      approveRoute: prepared.approveRoute,
    });

    return { networkId: network.id, chainId: network.chainId, messages, fee, memo: '' };
  }

  async prepare({ account, network, input: listedInput, output: listedOutput, quote, settings }: PrepareSwapInput): Promise<PreparedSwap> {
    const { config, repository } = this.require(network);

    if (quote.networkId !== network.id || quote.inputTokenId !== listedInput.id || quote.outputTokenId !== listedOutput.id
      || quote.inputPath !== listedInput.swapPath || quote.outputPath !== listedOutput.swapPath) {
      throw new AppError(AppErrorCode.SWAP_PRICE_MOVED, 'The quote no longer matches the selected tokens');
    }

    if (this.now() - quote.quotedAt > SWAP_QUOTE_TTL_MS) {
      throw new AppError(AppErrorCode.SWAP_PRICE_MOVED, 'The quote expired. Fetch a new one.');
    }

    // Recomputed locally from the dry run; validateRoutes again so a tampered quote object cannot be signed.
    validateRoutes(quote.routes, quote.inputPath, quote.outputPath, config.swap.feeTiers, isTokenPath);

    if (encodeRoutes(quote.routes).routeArr !== quote.routeArr || encodeRoutes(quote.routes).quoteArr !== quote.quoteArr) {
      throw new AppError(AppErrorCode.SWAP_PRICE_MOVED, 'The quote is inconsistent. Fetch a new one.');
    }

    const [input, output] = await this.onChainTokens(network, [listedInput, listedOutput]);

    const slippageBps = slippageToBps(effectiveSlippage(settings));
    const limits = swapLimits(quote, slippageBps);

    if (input.type === TokenType.NATIVE && BigInt(limits.maxAmountIn) < BigInt(config.swap.wrappedNative.minDeposit)) {
      throw new AppError(AppErrorCode.INVALID_AMOUNT, 'The amount is below the minimum swap');
    }

    const approveRoute = await repository.getApproveRoute(network, input);
    const base = { account, network, input, output, quote, slippageBps, ...limits, deadlineMinutes: settings.deadlineMinutes, approveRoute };
    const draft = await this.buildDraft(base, { gasWanted: '0', gasFee: '' });
    const estimate = await this.transactionService.estimateFee(draft, account, network);

    return { ...base, draft, estimate, preparedAt: this.now() };
  }

  // Native input keeps back the simulated fee (default tier x MAX margin) and storage deposit of the real
  // wrap/approve/swap[/unwrap] tx, probed at balance - reserve; the bundled reserve is only a fallback.
  async maxInputAmount({ account, network, input, output, balance, settings }: SwapMaxInput): Promise<SwapMaxResult> {
    if (input.type !== TokenType.NATIVE) {
      return { amount: balance, approximate: false };
    }

    const { config, repository } = this.require(network);
    const { minDeposit } = config.swap.wrappedNative;
    const balanceValue = BigInt(isRawAmount(balance) ? balance : '0');
    const fallbackReserve = BigInt(config.swap.nativeFeeReserve);
    const insufficient = (): AppError => new AppError(AppErrorCode.INSUFFICIENT_BALANCE, `Insufficient ${input.symbol} for the network fee`);
    const reserved = balanceValue - fallbackReserve;
    const probe = reserved >= BigInt(minDeposit) ? reserved : (balanceValue * 9n) / 10n;

    if (probe < BigInt(minDeposit)) {
      throw insufficient();
    }

    let max: bigint;
    let approximate = false;

    try {
      if (!output) {
        throw new Error('no output token to simulate');
      }

      const quote = await this.getQuote({ network, input, output, exactType: SwapType.EXACT_IN, amount: probe.toString() });
      const slippageBps = slippageToBps(effectiveSlippage(settings));
      const draft = await this.buildDraft({
        account,
        network,
        input,
        output,
        quote,
        slippageBps,
        ...swapLimits(quote, slippageBps),
        deadlineMinutes: settings.deadlineMinutes,
        approveRoute: await repository.getApproveRoute(network, input),
      }, { gasWanted: '0', gasFee: '' });
      const estimate = await this.transactionService.estimateFee(draft, account, network);

      max = balanceValue - BigInt(maxFeeReserve(estimate));
    }
    catch {
      max = reserved;
      approximate = true;
    }

    if (max < BigInt(minDeposit)) {
      throw insufficient();
    }

    return { amount: max.toString(), approximate };
  }

  // Rejects an expired review, re-quotes the exact signed route, refreshes the deadline, then signs and broadcasts.
  async submit(prepared: PreparedSwap, fee: TransactionFee, options: SignAndBroadcastOptions = {}): Promise<BroadcastResult> {
    const { config, repository } = this.require(prepared.network);
    const { quote, account, network } = prepared;

    if (this.now() - prepared.preparedAt > SWAP_REVIEW_TTL_MS) {
      throw new AppError(AppErrorCode.SWAP_PRICE_MOVED, 'The review expired. Review a new quote.');
    }

    const exactOut = quote.exactType === SwapType.EXACT_OUT;
    const dry = await repository.drySwap(network, config, {
      inputPath: quote.inputPath,
      outputPath: quote.outputPath,
      exactType: quote.exactType,
      amount: exactOut ? exactOutTarget(quote) : quote.amountIn,
      routeArr: quote.routeArr,
      quoteArr: quote.quoteArr,
    }).catch((error: unknown) => {
      throw new AppError(AppErrorCode.SWAP_PRICE_MOVED, 'The route can no longer fill this swap. Review a new quote.', { cause: error });
    });
    const moved = exactOut
      ? !this.fills(quote.exactType, exactOutTarget(quote), dry, hopCount(quote.routes)) || BigInt(dry.amountIn) > BigInt(prepared.maxAmountIn)
      : dry.amountIn !== quote.amountIn || BigInt(dry.amountOut) < BigInt(prepared.minAmountOut);

    if (moved) {
      throw new AppError(AppErrorCode.SWAP_PRICE_MOVED, 'The price moved beyond your slippage. Review a new quote.');
    }

    const draft = await this.buildDraft(prepared, fee);
    const reviewed = repository.messageTargets(prepared.draft.messages);
    const rebuilt = repository.messageTargets(draft.messages);

    if (rebuilt.length !== reviewed.length || rebuilt.some((target, index) => target !== reviewed[index])) {
      throw new AppError(AppErrorCode.SWAP_PRICE_MOVED, 'The swap transaction changed since the review. Review a new quote.');
    }

    await this.transactionService.assertSufficientFunds(draft, account, network, { token: prepared.input, amount: prepared.maxAmountIn }, prepared.estimate.storageDeposit);
    return this.transactionService.signAndBroadcast(draft, account, network, options);
  }
}
