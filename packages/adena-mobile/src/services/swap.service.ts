import { AppError, AppErrorCode } from '../core/errors';
import { Account } from '../domain/account';
import { FeeEstimate } from '../domain/fee';
import { Network } from '../domain/network';
import {
  effectiveSlippage,
  encodeRoutes,
  estimatePriceImpact,
  isRawAmount,
  minAmountOut,
  slippageToBps,
  swapDeadline,
  SwapQuote,
  SwapSettings,
  SwapToken,
  validateRoutes,
} from '../domain/swap';
import { TokenType } from '../domain/token';
import { BroadcastResult, TransactionDraft, TransactionFee } from '../domain/transaction';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { GnoRpcTimeoutError } from '../repositories/chain/gno/gno-provider';
import { SwapRepository } from '../repositories/chain/swap-repository';
import { DEX_API_CONFIG, DexApiConfig, DexApiConfigMap, DexSwapConfig, isTokenPath } from '../resources';
import { AccountService } from './account.service';
import { TransactionService } from './transaction.service';

// A quote older than this is fetched again before it can be reviewed.
export const SWAP_QUOTE_TTL_MS = 60_000;

export interface SwapQuoteRequest {
  network: Network;
  input: SwapToken;
  output: SwapToken;
  // Raw exact-in amount.
  amountIn: string;
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
  minAmountOut: string;
  deadlineMinutes: number;
  draft: TransactionDraft;
  estimate: FeeEstimate;
}

type SupportedConfig = DexApiConfig & { swap: DexSwapConfig };

// GnoSwap exact-in swaps: route candidates -> router dry run -> wrap/approve/swap/unwrap transaction.
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

  async getQuote({ network, input, output, amountIn }: SwapQuoteRequest): Promise<SwapQuote> {
    const { config, repository } = this.require(network);

    if (input.swapPath === output.swapPath) {
      throw new AppError(AppErrorCode.SWAP_INVALID_TOKEN, 'Choose two different tokens');
    }

    if (!isRawAmount(amountIn) || BigInt(amountIn) <= 0n) {
      throw new AppError(AppErrorCode.INVALID_AMOUNT, 'Enter an amount greater than zero');
    }

    const request = { inputPath: input.swapPath, outputPath: output.swapPath, amountIn };
    const [candidates, feeBps] = await Promise.all([
      repository.findRouteCandidates(network, config, request),
      repository.getRouterFeeBps(network, config).catch(() => null),
    ]);
    let routeRejected = false;
    const results = await Promise.all(candidates.map(async (candidate) => {
      try {
        validateRoutes(candidate.routes, request.inputPath, request.outputPath, config.swap.feeTiers, isTokenPath);
        const encoded = encodeRoutes(candidate.routes);
        const dry = await repository.drySwap(network, config, { ...request, ...encoded });

        // Exact-in must consume the whole input; a partial fill means the route ran out of liquidity.
        if (dry.amountIn !== amountIn || BigInt(dry.amountOut) <= 0n) {
          routeRejected = true;
          return null;
        }

        return { candidate, encoded, amountOut: dry.amountOut };
      }
      catch (error) {
        // Timeouts and transport failures say nothing about the route; anything else is the router (or the data) refusing it.
        if (!(error instanceof GnoRpcTimeoutError) && !(error instanceof AppError)) {
          routeRejected = true;
        }

        return null;
      }
    }));
    const best = results.reduce<(typeof results)[number]>(
      (current, next) => (next && (!current || BigInt(next.amountOut) > BigInt(current.amountOut)) ? next : current),
      null,
    );

    if (!best) {
      throw candidates.length === 0 || routeRejected
        ? new AppError(AppErrorCode.SWAP_NO_ROUTE, 'Not enough liquidity for this swap')
        : new AppError(AppErrorCode.SWAP_QUOTE_FAILED, 'Couldn’t get a quote. Check your connection and try again.');
    }

    const routerFeeBps = feeBps ?? 0;

    return {
      networkId: network.id,
      inputTokenId: input.id,
      outputTokenId: output.id,
      inputPath: request.inputPath,
      outputPath: request.outputPath,
      amountIn,
      amountOut: best.amountOut,
      routes: best.candidate.routes,
      routeArr: best.encoded.routeArr,
      quoteArr: best.encoded.quoteArr,
      routerFeeBps,
      priceImpactPercent: estimatePriceImpact(best.candidate.routes, amountIn, best.amountOut, routerFeeBps),
      source: best.candidate.source,
      quotedAt: this.now(),
    };
  }

  // GRC20 metadata from the API is only trusted once the chain agrees on the registry entry and decimals.
  private async assertOnChainTokens(network: Network, tokens: SwapToken[]): Promise<void> {
    const assets = this.chainRegistry.assets(network);

    for (const token of tokens.filter(item => item.type === TokenType.GRC20)) {
      const onChain = await assets.findToken(token.id, network);

      if (!onChain || onChain.decimals !== token.decimals) {
        throw new AppError(AppErrorCode.SWAP_INVALID_TOKEN, `${token.symbol} details don’t match the chain. Swap is blocked for this token.`);
      }
    }
  }

  private async buildDraft(prepared: Omit<PreparedSwap, 'draft' | 'estimate'>, fee: TransactionFee): Promise<TransactionDraft> {
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
      amountIn: quote.amountIn,
      minAmountOut: prepared.minAmountOut,
      routeArr: quote.routeArr,
      quoteArr: quote.quoteArr,
      deadline: swapDeadline(this.now(), prepared.deadlineMinutes),
    });

    return { networkId: network.id, chainId: network.chainId, messages, fee, memo: '' };
  }

  async prepare({ account, network, input, output, quote, settings }: PrepareSwapInput): Promise<PreparedSwap> {
    const { config } = this.require(network);

    if (quote.networkId !== network.id || quote.inputTokenId !== input.id || quote.outputTokenId !== output.id
      || quote.inputPath !== input.swapPath || quote.outputPath !== output.swapPath) {
      throw new AppError(AppErrorCode.SWAP_PRICE_MOVED, 'The quote no longer matches the selected tokens');
    }

    if (this.now() - quote.quotedAt > SWAP_QUOTE_TTL_MS) {
      throw new AppError(AppErrorCode.SWAP_PRICE_MOVED, 'The quote expired. Fetch a new one.');
    }

    if (input.type === TokenType.NATIVE && BigInt(quote.amountIn) < BigInt(config.swap.wrappedNative.minDeposit)) {
      throw new AppError(AppErrorCode.INVALID_AMOUNT, 'The amount is below the minimum swap');
    }

    // Recomputed locally from the dry run; validateRoutes again so a tampered quote object cannot be signed.
    validateRoutes(quote.routes, quote.inputPath, quote.outputPath, config.swap.feeTiers, isTokenPath);

    if (encodeRoutes(quote.routes).routeArr !== quote.routeArr || encodeRoutes(quote.routes).quoteArr !== quote.quoteArr) {
      throw new AppError(AppErrorCode.SWAP_PRICE_MOVED, 'The quote is inconsistent. Fetch a new one.');
    }

    await this.assertOnChainTokens(network, [input, output]);

    const slippageBps = slippageToBps(effectiveSlippage(settings));
    const base = {
      account,
      network,
      input,
      output,
      quote,
      slippageBps,
      minAmountOut: minAmountOut(quote.amountOut, slippageBps),
      deadlineMinutes: settings.deadlineMinutes,
    };
    const draft = await this.buildDraft(base, { gasWanted: '0', gasFee: '' });
    const estimate = await this.transactionService.estimateFee(draft, account, network);

    return { ...base, draft, estimate };
  }

  // Re-quotes the exact signed route, refreshes the deadline, then signs and broadcasts.
  async submit(prepared: PreparedSwap, fee: TransactionFee): Promise<BroadcastResult> {
    const { config, repository } = this.require(prepared.network);
    const { quote, account, network } = prepared;
    const dry = await repository.drySwap(network, config, {
      inputPath: quote.inputPath,
      outputPath: quote.outputPath,
      amountIn: quote.amountIn,
      routeArr: quote.routeArr,
      quoteArr: quote.quoteArr,
    }).catch((error: unknown) => {
      throw new AppError(AppErrorCode.SWAP_PRICE_MOVED, 'The route can no longer fill this swap. Review a new quote.', { cause: error });
    });

    if (dry.amountIn !== quote.amountIn || BigInt(dry.amountOut) < BigInt(prepared.minAmountOut)) {
      throw new AppError(AppErrorCode.SWAP_PRICE_MOVED, 'The price moved beyond your slippage. Review a new quote.');
    }

    const draft = await this.buildDraft(prepared, fee);

    await this.transactionService.assertSufficientFunds(draft, account, network, { token: prepared.input, amount: quote.amountIn }, prepared.estimate.storageDeposit);
    return this.transactionService.signAndBroadcast(draft, account, network);
  }
}
