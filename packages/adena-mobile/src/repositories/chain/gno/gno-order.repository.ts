import { AppError, AppErrorCode } from '../../../core/errors';
import { Network } from '../../../domain/network';
import { DcaOrder, DcaRules, LimitOrder, LimitRules, Order, OrderKind } from '../../../domain/order';
import { DexOrderConfig, getGrc20RegistryConfig } from '../../../resources';
import { CreateDcaRequest, CreateLimitRequest, OrderRepository } from '../order-repository';
import { GnoMessage } from './gno-messages';
import { GnoProviderFactory } from './gno-provider';
import { buildIife, decodeGoString, gnoLiteral, parseQEvalResult } from './gno-qeval';
import { buildApproveMessage, buildCallMessage, buildWrapMessage } from './gno-swap-messages';

// Owner orders read per query; the realms page by ID.
export const ORDER_PAGE_SIZE = 100;

// int64 -> decimal inside a qeval expression, which cannot import strconv.
const ITOA = 'itoa := func(n int64) string { if n == 0 { return "0" }; neg := n < 0; if neg { n = -n }; s := ""; for n > 0 { s = string(rune(48 + n%10)) + s; n /= 10 }; if neg { s = "-" + s }; return s }';
// Exclusive upper bound of an owner's 8-byte encoded ID keys (plimit.PrefixEnd).
const PREFIX_END = '"\\xff\\xff\\xff\\xff\\xff\\xff\\xff\\xff\\xff"';

const RECORD_SEPARATOR = ';';
const FIELD_SEPARATOR = '|';

const toNetworkError = (error: unknown): AppError =>
  error instanceof AppError ? error : new AppError(AppErrorCode.NETWORK_ERROR, (error as Error)?.message, { cause: error });

const records = (raw: string): string[][] =>
  decodeGoString(raw).split(RECORD_SEPARATOR).filter(Boolean).map(record => record.split(FIELD_SEPARATOR));

const int = (value: string | undefined): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const uint = (value: string | undefined): string => (/^\d+$/.test(value ?? '') ? (value as string) : '0');

// Group IDs are "inputToken:outputToken:interval:slotOffset".
const parseGroupId = (groupId: string): { inputToken: string; outputToken: string } => {
  const [inputToken = '', outputToken = ''] = groupId.split(':');

  return { inputToken, outputToken };
};

export const parseDcaOrders = (raw: string): DcaOrder[] => records(raw).flatMap((fields) => {
  const [id, groupId, interval, amountPerExecution, startRound, endRound, round, next, claimable, createdAt] = fields;

  if (!/^\d+$/.test(id ?? '') || !groupId) {
    return [];
  }

  const executionCount = Math.max(int(endRound) - int(startRound), 0);

  return [{
    kind: OrderKind.DCA,
    id,
    ...parseGroupId(groupId),
    interval: int(interval),
    amountPerExecution: uint(amountPerExecution),
    executionCount,
    executedCount: Math.min(Math.max(int(round) - int(startRound), 0), executionCount),
    nextExecutionAt: int(next),
    claimable: uint(claimable),
    createdAt: int(createdAt),
  }];
});

export const parseLimitOrders = (raw: string): LimitOrder[] => records(raw).flatMap((fields) => {
  const [id, inputToken, outputToken, making, taking, slippage, filled, gross, fee, createdAt, expiresAt] = fields;

  if (!/^\d+$/.test(id ?? '') || !inputToken || !outputToken) {
    return [];
  }

  return [{
    kind: OrderKind.LIMIT,
    id,
    inputToken,
    outputToken,
    makingAmount: uint(making),
    takingAmount: uint(taking),
    slippageBps: int(slippage),
    filledInput: uint(filled),
    grossOutput: uint(gross),
    executionFee: uint(fee),
    createdAt: int(createdAt),
    expiresAt: int(expiresAt),
  }];
});

export const dcaOrdersExpression = (owner: string): string => buildIife('string', [
  ITOA,
  's := ""',
  `for _, id := range GetOrderIDsByOwner(address(${gnoLiteral(owner)}), 0, ${ORDER_PAGE_SIZE}) { `
  + 'o, err := GetOrder(id); if err != nil { continue }; '
  + 'round := int64(0); next := int64(0); interval := int64(0); '
  + 'if g, gerr := GetGroup(o.GroupID()); gerr == nil { round = int64(g.Round()); next = g.NextExecutionTimestamp(); interval = g.Interval() }; '
  + 's += itoa(int64(id)) + "|" + o.GroupID() + "|" + itoa(interval) + "|" + itoa(o.AmountPerExecution()) + "|" + itoa(int64(o.StartRound())) + "|" '
  + '+ itoa(int64(o.EndRound())) + "|" + itoa(round) + "|" + itoa(next) + "|" + itoa(GetClaimableAmount(id)) + "|" + itoa(o.CreatedTimestamp()) + ";" }',
], 's');

export const limitOrdersExpression = (owner: string): string => buildIife('string', [
  ITOA,
  's := ""',
  `prefix := ${gnoLiteral(`${owner}/`)}`,
  'GetOrdersByOwner().Iterate(prefix, prefix + ' + PREFIX_END + ', func(key string, value any) bool { '
  + 'id, ok := value.(uint64); if !ok { return false }; o := GetOrder(id); if o == nil { return false }; '
  + 's += itoa(int64(id)) + "|" + o.TokenIn() + "|" + o.TokenOut() + "|" + itoa(o.MakingAmount()) + "|" + itoa(o.TakingAmount()) + "|" + itoa(o.SlippageBps()) + "|" '
  + '+ itoa(o.FilledInput()) + "|" + itoa(o.GrossOutput()) + "|" + itoa(o.ExecutionFee()) + "|" + itoa(o.CreatedAt()) + "|" + itoa(o.ExpiresAt()) + ";"; '
  + 'return len(s) > 60000 })',
], 's');

export const dcaRulesExpression = (inputPath: string, outputPath: string): string => buildIife('(string, int64, int64, int64, string)', [
  ITOA,
  's := ""',
  'for _, i := range GetAllowedIntervals() { s += itoa(i) + ":" + itoa(GetSlotStep(i)) + "," }',
  `limit, _ := GetPairPriceLimit(${gnoLiteral(inputPath)}, ${gnoLiteral(outputPath)})`,
], `s, GetMinAmountPerExecution(${gnoLiteral(inputPath)}), GetMaxExecutionCount(), GetExecutionFeeRate(), limit`);

const LIMIT_RULES_EXPRESSION = buildIife('(int64, int64, int64, int64, int64)', ['minDuration, maxDuration := GetOrderDeadlines()'], 'GetMinMakingAmount(), GetMaxSlippageBps(), minDuration, maxDuration, GetExecutionFeeRate()');

export class GnoOrderRepository implements OrderRepository {
  constructor(private readonly providerFactory: GnoProviderFactory) {}

  private async evaluate(network: Network, pkgPath: string, expression: string): Promise<string> {
    try {
      return await (await this.providerFactory(network.rpcUrl)).evaluateExpression(pkgPath, expression);
    }
    catch (error) {
      throw toNetworkError(error);
    }
  }

  private async hasWhitelistedPool(network: Network, config: DexOrderConfig, target: string, inputPath: string, outputPath: string): Promise<boolean> {
    const [result] = parseQEvalResult(await this.evaluate(network, config.whitelistPath, `HasWhitelistedPool(${gnoLiteral(target)}, ${gnoLiteral(inputPath)}, ${gnoLiteral(outputPath)})`));

    return result?.value === 'true';
  }

  async getRealmAddress(network: Network, realmPath: string): Promise<string> {
    const [result] = parseQEvalResult(await this.evaluate(network, realmPath, 'Address()'));

    return decodeGoString(result?.value ?? '');
  }

  async getDcaRules(network: Network, config: DexOrderConfig, inputPath: string, outputPath: string): Promise<DcaRules> {
    const [rules, whitelisted] = await Promise.all([
      this.evaluate(network, config.dcaPath, dcaRulesExpression(inputPath, outputPath)).then(parseQEvalResult),
      this.hasWhitelistedPool(network, config, 'dca', inputPath, outputPath),
    ]);
    const [intervals, minAmount, maxCount, feeRate, priceLimit] = rules;
    const pairs = decodeGoString(intervals?.value ?? '""').split(',').filter(Boolean).map(pair => pair.split(':').map(Number));
    const limit = decodeGoString(priceLimit?.value ?? '""');

    return {
      intervals: pairs.map(([interval]) => interval).filter(interval => interval > 0),
      slotSteps: Object.fromEntries(pairs.filter(([interval]) => interval > 0).map(([interval, step]) => [interval, step])),
      minAmountPerExecution: uint(minAmount?.value),
      maxExecutionCount: int(maxCount?.value),
      executionFeeBps: int(feeRate?.value),
      tradable: whitelisted && limit !== '' && limit !== '0',
    };
  }

  async getLimitRules(network: Network, config: DexOrderConfig, inputPath: string, outputPath: string): Promise<LimitRules> {
    const [rules, tradable] = await Promise.all([
      this.evaluate(network, config.limitPath, LIMIT_RULES_EXPRESSION).then(parseQEvalResult),
      this.hasWhitelistedPool(network, config, 'limit', inputPath, outputPath),
    ]);
    const [minMaking, maxSlippage, minDuration, maxDuration, feeRate] = rules;

    return {
      minMakingAmount: uint(minMaking?.value),
      maxSlippageBps: int(maxSlippage?.value),
      minDuration: int(minDuration?.value),
      maxDuration: int(maxDuration?.value),
      executionFeeBps: int(feeRate?.value),
      tradable,
    };
  }

  async listOrders(network: Network, config: DexOrderConfig, owner: string): Promise<Order[]> {
    const [dca, limit] = await Promise.all([
      this.evaluate(network, config.dcaPath, dcaOrdersExpression(owner)),
      this.evaluate(network, config.limitPath, limitOrdersExpression(owner)),
    ]);
    const [dcaRaw] = parseQEvalResult(dca);
    const [limitRaw] = parseQEvalResult(limit);

    return [...parseDcaOrders(dcaRaw?.value ?? '""'), ...parseLimitOrders(limitRaw?.value ?? '""')];
  }

  private fund(request: CreateDcaRequest | CreateLimitRequest, amount: string): GnoMessage[] {
    const { caller, swap, network, input, spender } = request;

    return [
      ...(input.native ? [buildWrapMessage(caller, swap, amount)] : []),
      buildApproveMessage({
        caller,
        config: swap,
        registry: getGrc20RegistryConfig(network.chainId),
        token: { native: input.native, swapPath: input.path, approveRoute: input.approveRoute ?? undefined },
        spender,
        amount,
      }),
    ];
  }

  // [wugnot.Deposit] -> approve(total) -> CreateOrder; the realm escrows the total at creation.
  buildCreateDcaMessages(request: CreateDcaRequest): GnoMessage[] {
    const total = (BigInt(request.amountPerExecution) * BigInt(request.executionCount)).toString();

    return [
      ...this.fund(request, total),
      buildCallMessage(request.caller, request.orders.dcaPath, 'CreateOrder', [
        request.input.path,
        request.outputPath,
        String(request.interval),
        String(request.slotOffset),
        request.amountPerExecution,
        String(request.executionCount),
      ]),
    ];
  }

  // baseToken is creation metadata only; these orders sell their input.
  buildCreateLimitMessages(request: CreateLimitRequest): GnoMessage[] {
    return [
      ...this.fund(request, request.makingAmount),
      buildCallMessage(request.caller, request.orders.limitPath, 'CreateOrder', [
        request.input.path,
        request.outputPath,
        request.makingAmount,
        request.takingAmount,
        String(request.slippageBps),
        String(request.expiresAt),
        request.input.path,
      ]),
    ];
  }

  buildClaimMessages(caller: string, config: DexOrderConfig, order: Order): GnoMessage[] {
    if (order.kind !== OrderKind.DCA) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Limit orders pay out on every fill');
    }

    return [buildCallMessage(caller, config.dcaPath, 'Claim', [order.id])];
  }

  buildCancelMessages(caller: string, config: DexOrderConfig, order: Order): GnoMessage[] {
    return [buildCallMessage(caller, order.kind === OrderKind.DCA ? config.dcaPath : config.limitPath, 'CancelOrder', [order.id])];
  }
}
