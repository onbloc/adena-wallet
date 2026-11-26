import { AppError, AppErrorCode } from '../core/errors';
import { Account } from '../domain/account';
import { FeeEstimate } from '../domain/fee';
import { Network } from '../domain/network';
import {
  DcaRules,
  dcaTotal,
  firstRoundAt,
  LimitRules,
  nextSlotOffset,
  Order,
  OrderKind,
  validateDcaInput,
  validateLimitInput,
} from '../domain/order';
import { SwapToken, SwapType } from '../domain/swap';
import { TokenType } from '../domain/token';
import { BroadcastResult, TransactionDraft, TransactionFee } from '../domain/transaction';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { OrderInputToken, OrderRepository } from '../repositories/chain/order-repository';
import { DexApiConfigMap, DexOrderConfig, DexSwapConfig } from '../resources';
import { derivePackageAddress } from '../utils/address';
import { AccountService } from './account.service';
import { SwapService } from './swap.service';
import { TransactionService } from './transaction.service';

export const OrderAction = {
  CREATE_DCA: 'createDca',
  CREATE_LIMIT: 'createLimit',
  CLAIM: 'claim',
  CANCEL: 'cancel',
} as const;

export type OrderAction = (typeof OrderAction)[keyof typeof OrderAction];

export interface DcaRequest {
  input: SwapToken;
  output: SwapToken;
  interval: number;
  // Raw input amount per round.
  amountPerExecution: string;
  executionCount: number;
}

export interface LimitRequest {
  input: SwapToken;
  output: SwapToken;
  makingAmount: string;
  takingAmount: string;
  slippageBps: number;
  // Seconds from now.
  duration: number;
}

export interface PreparedOrderTransaction {
  action: OrderAction;
  account: Account;
  network: Network;
  draft: TransactionDraft;
  estimate: FeeEstimate;
  // Input moved into escrow by a create, checked against the balance before signing.
  escrow?: { token: SwapToken; amount: string };
  dca?: DcaRequest & { firstRoundAt: number; slotOffset: number };
  limit?: LimitRequest & { expiresAt: number };
  order?: Order;
}

const EMPTY_FEE: TransactionFee = { gasWanted: '0', gasFee: '' };

export class OrderService {
  constructor(
    private readonly chainRegistry: ChainRegistry,
    private readonly accountService: AccountService,
    private readonly transactionService: TransactionService,
    private readonly swapService: SwapService,
    private readonly dexConfig: DexApiConfigMap,
    private readonly now: () => number = Date.now,
  ) {}

  private configFor(network: Network): { swap: DexSwapConfig; orders: DexOrderConfig; repository: OrderRepository } | undefined {
    const config = this.dexConfig[network.id];
    const repository = this.chainRegistry.orders(network);

    return config?.swap && config.orders && repository && !network.isCustom ? { swap: config.swap, orders: config.orders, repository } : undefined;
  }

  private require(network: Network): { swap: DexSwapConfig; orders: DexOrderConfig; repository: OrderRepository } {
    const config = this.configFor(network);

    if (!config) {
      throw new AppError(AppErrorCode.UNSUPPORTED_NETWORK, 'Orders are not available on this network');
    }

    return config;
  }

  private nowSeconds(): number {
    return Math.floor(this.now() / 1000);
  }

  isSupported(network: Network): boolean {
    return this.configFor(network) !== undefined;
  }

  getTokens(network: Network): Promise<SwapToken[]> {
    return this.swapService.getTokens(network);
  }

  getBalances(account: Account, network: Network, tokens: SwapToken[]): Promise<Record<string, string>> {
    return this.swapService.getBalances(account, network, tokens);
  }

  listOrders(account: Account, network: Network): Promise<Order[]> {
    const { orders, repository } = this.require(network);

    return repository.listOrders(network, orders, this.accountService.getAddress(account, network))
      .then(list => [...list].sort((a, b) => b.createdAt - a.createdAt));
  }

  async getOrder(account: Account, network: Network, kind: OrderKind, id: string): Promise<Order | null> {
    return (await this.listOrders(account, network)).find(order => order.kind === kind && order.id === id) ?? null;
  }

  getDcaRules(network: Network, input: SwapToken, output: SwapToken): Promise<DcaRules> {
    const { orders, repository } = this.require(network);

    return repository.getDcaRules(network, orders, input.swapPath, output.swapPath);
  }

  getLimitRules(network: Network, input: SwapToken, output: SwapToken): Promise<LimitRules> {
    const { orders, repository } = this.require(network);

    return repository.getLimitRules(network, orders, input.swapPath, output.swapPath);
  }

  // What selling `amount` would return right now, for a price hint; null without a route.
  async marketOutput(network: Network, input: SwapToken, output: SwapToken, amount: string): Promise<string | null> {
    try {
      return (await this.swapService.getQuote({ network, input, output, exactType: SwapType.EXACT_IN, amount })).amountOut;
    }
    catch {
      return null;
    }
  }

  // The approve spender must be the custody realm itself: its on-chain address is checked against its path.
  private async spender(network: Network, realmPath: string, repository: OrderRepository): Promise<string> {
    const expected = derivePackageAddress(realmPath);
    const reported = await repository.getRealmAddress(network, realmPath);

    if (reported !== expected) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'The order contract did not report its own address. Try again later.');
    }

    return expected;
  }

  private async inputToken(network: Network, token: SwapToken, swap: DexSwapConfig): Promise<OrderInputToken> {
    const native = token.type === TokenType.NATIVE;
    const approveRoute = native ? null : await this.chainRegistry.swap(network)?.getApproveRoute(network, token) ?? null;

    return { native, path: native ? swap.wrappedNative.tokenPath : token.swapPath, approveRoute };
  }

  private assertWrappable(token: SwapToken, amount: string, swap: DexSwapConfig): void {
    if (token.type === TokenType.NATIVE && BigInt(amount) < BigInt(swap.wrappedNative.minDeposit)) {
      throw new AppError(AppErrorCode.INVALID_AMOUNT, 'The amount is below the minimum that can be wrapped');
    }
  }

  async prepareDca(account: Account, network: Network, request: DcaRequest): Promise<PreparedOrderTransaction> {
    const { swap, orders, repository } = this.require(network);
    const rules = await this.getDcaRules(network, request.input, request.output);
    const errors = validateDcaInput({ ...request, inputToken: request.input.swapPath, outputToken: request.output.swapPath }, rules);

    if (errors.length > 0) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, errors.includes('pair') ? 'GnoSwap does not run recurring buys for this pair yet' : 'Check the order settings');
    }

    const total = dcaTotal(request);

    this.assertWrappable(request.input, total, swap);

    const nowSeconds = this.nowSeconds();
    const slotOffset = nextSlotOffset(request.interval, rules.slotSteps[request.interval] ?? request.interval, nowSeconds);
    const caller = this.accountService.getAddress(account, network);
    const messages = repository.buildCreateDcaMessages({
      network,
      caller,
      swap,
      orders,
      input: await this.inputToken(network, request.input, swap),
      outputPath: request.output.swapPath,
      spender: await this.spender(network, orders.dcaPath, repository),
      interval: request.interval,
      slotOffset,
      amountPerExecution: request.amountPerExecution,
      executionCount: request.executionCount,
    });
    const draft = this.draft(network, messages);

    return {
      action: OrderAction.CREATE_DCA,
      account,
      network,
      draft,
      estimate: await this.transactionService.estimateFee(draft, account, network),
      escrow: { token: request.input, amount: total },
      dca: { ...request, slotOffset, firstRoundAt: firstRoundAt(request.interval, slotOffset, nowSeconds) },
    };
  }

  async prepareLimit(account: Account, network: Network, request: LimitRequest): Promise<PreparedOrderTransaction> {
    const { swap, orders, repository } = this.require(network);
    const rules = await this.getLimitRules(network, request.input, request.output);
    const nowSeconds = this.nowSeconds();
    const expiresAt = nowSeconds + request.duration;
    const errors = validateLimitInput({ ...request, inputToken: request.input.swapPath, outputToken: request.output.swapPath, expiresAt }, rules, nowSeconds);

    if (errors.length > 0) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, errors.includes('pair') ? 'GnoSwap does not take limit orders for this pair yet' : 'Check the order settings');
    }

    this.assertWrappable(request.input, request.makingAmount, swap);

    const messages = repository.buildCreateLimitMessages({
      network,
      caller: this.accountService.getAddress(account, network),
      swap,
      orders,
      input: await this.inputToken(network, request.input, swap),
      outputPath: request.output.swapPath,
      spender: await this.spender(network, orders.limitPath, repository),
      makingAmount: request.makingAmount,
      takingAmount: request.takingAmount,
      slippageBps: request.slippageBps,
      expiresAt,
    });
    const draft = this.draft(network, messages);

    return {
      action: OrderAction.CREATE_LIMIT,
      account,
      network,
      draft,
      estimate: await this.transactionService.estimateFee(draft, account, network),
      escrow: { token: request.input, amount: request.makingAmount },
      limit: { ...request, expiresAt },
    };
  }

  async prepareClaim(account: Account, network: Network, order: Order): Promise<PreparedOrderTransaction> {
    const { orders, repository } = this.require(network);
    const draft = this.draft(network, repository.buildClaimMessages(this.accountService.getAddress(account, network), orders, order));

    return { action: OrderAction.CLAIM, account, network, draft, order, estimate: await this.transactionService.estimateFee(draft, account, network) };
  }

  async prepareCancel(account: Account, network: Network, order: Order): Promise<PreparedOrderTransaction> {
    const { orders, repository } = this.require(network);
    const draft = this.draft(network, repository.buildCancelMessages(this.accountService.getAddress(account, network), orders, order));

    return { action: OrderAction.CANCEL, account, network, draft, order, estimate: await this.transactionService.estimateFee(draft, account, network) };
  }

  async submit(prepared: PreparedOrderTransaction, fee: TransactionFee): Promise<BroadcastResult> {
    const { account, network, estimate, escrow } = prepared;
    const draft = { ...prepared.draft, fee };

    await this.transactionService.assertSufficientFunds(draft, account, network, escrow, estimate.storageDeposit);
    return this.transactionService.signAndBroadcast(draft, account, network);
  }

  private draft(network: Network, messages: unknown[]): TransactionDraft {
    return { networkId: network.id, chainId: network.chainId, messages, fee: EMPTY_FEE, memo: '' };
  }
}
