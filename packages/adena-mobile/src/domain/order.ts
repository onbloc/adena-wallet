import { BigNumber } from '../utils/big-number';

// Escrowed GnoSwap orders (gnoswap-order-protocol). GnoSwap keepers run them; the owner only
// creates, claims and cancels, each signed by the account itself.

export const OrderKind = {
  DCA: 'dca',
  LIMIT: 'limit',
} as const;

export type OrderKind = (typeof OrderKind)[keyof typeof OrderKind];

// Order realms take int64 amounts.
export const MAX_ORDER_AMOUNT = 9223372036854775807n;

export interface DcaOrder {
  kind: typeof OrderKind.DCA;
  id: string;
  // Registry keys ("{realm}.{symbol}").
  inputToken: string;
  outputToken: string;
  // Seconds between rounds.
  interval: number;
  amountPerExecution: string;
  executionCount: number;
  // Rounds this order already took part in.
  executedCount: number;
  // Unix seconds; 0 when the group has nothing scheduled.
  nextExecutionAt: number;
  // Output the owner can claim now, net of the execution fee.
  claimable: string;
  createdAt: number;
}

export interface LimitOrder {
  kind: typeof OrderKind.LIMIT;
  id: string;
  inputToken: string;
  outputToken: string;
  makingAmount: string;
  // Owner-net output target for the whole making amount.
  takingAmount: string;
  slippageBps: number;
  filledInput: string;
  // Pool output so far, before the execution fee.
  grossOutput: string;
  executionFee: string;
  createdAt: number;
  expiresAt: number;
}

export type Order = DcaOrder | LimitOrder;

export interface DcaRules {
  // Seconds, e.g. 3600, 86400, 604800.
  intervals: number[];
  slotSteps: Record<number, number>;
  minAmountPerExecution: string;
  maxExecutionCount: number;
  executionFeeBps: number;
  // A whitelisted direct pool and a pair price limit; without both the pair cannot take orders.
  tradable: boolean;
}

export interface LimitRules {
  minMakingAmount: string;
  maxSlippageBps: number;
  minDuration: number;
  maxDuration: number;
  executionFeeBps: number;
  tradable: boolean;
}

export interface DcaOrderInput {
  inputToken: string;
  outputToken: string;
  interval: number;
  amountPerExecution: string;
  executionCount: number;
}

export interface LimitOrderInput {
  inputToken: string;
  outputToken: string;
  makingAmount: string;
  takingAmount: string;
  slippageBps: number;
  // Unix seconds.
  expiresAt: number;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const LIMIT_DURATIONS = [DAY, 7 * DAY, 30 * DAY];
export const LIMIT_SLIPPAGE_OPTIONS_BPS = [0, 50, 100];

// The first slot at or after `now`: rounds run when `timestamp % interval == slotOffset`.
export const nextSlotOffset = (interval: number, slotStep: number, nowSeconds: number): number => {
  const step = slotStep > 0 ? slotStep : interval;
  const slot = Math.ceil((nowSeconds % interval) / step) * step;

  return slot >= interval ? 0 : slot;
};

export const firstRoundAt = (interval: number, slotOffset: number, nowSeconds: number): number => {
  const base = nowSeconds - (nowSeconds % interval) + slotOffset;

  return base >= nowSeconds ? base : base + interval;
};

export const formatInterval = (interval: number): string => {
  switch (interval) {
    case MINUTE:
      return 'Every minute';
    case HOUR:
      return 'Every hour';
    case DAY:
      return 'Every day';
    case 7 * DAY:
      return 'Every week';
    case 30 * DAY:
      return 'Every 30 days';
    default:
      return interval % DAY === 0 ? `Every ${interval / DAY} days` : interval % HOUR === 0 ? `Every ${interval / HOUR} hours` : `Every ${interval} seconds`;
  }
};

export const dcaTotal = (input: Pick<DcaOrderInput, 'amountPerExecution' | 'executionCount'>): string =>
  new BigNumber(input.amountPerExecution).multipliedBy(input.executionCount).toFixed(0);

export type DcaInputError = 'pair' | 'amount' | 'belowMinimum' | 'count' | 'interval' | 'tooLarge';

export const validateDcaInput = (input: DcaOrderInput, rules: DcaRules): DcaInputError[] => {
  const errors: DcaInputError[] = [];

  if (!rules.tradable || input.inputToken === input.outputToken) {
    errors.push('pair');
  }

  if (!/^[1-9]\d*$/.test(input.amountPerExecution)) {
    errors.push('amount');
  }
  else if (new BigNumber(input.amountPerExecution).isLessThan(rules.minAmountPerExecution)) {
    errors.push('belowMinimum');
  }

  if (!Number.isInteger(input.executionCount) || input.executionCount < 1 || input.executionCount > rules.maxExecutionCount) {
    errors.push('count');
  }

  if (!rules.intervals.includes(input.interval)) {
    errors.push('interval');
  }

  if (/^\d+$/.test(input.amountPerExecution) && BigInt(dcaTotal(input)) > MAX_ORDER_AMOUNT) {
    errors.push('tooLarge');
  }

  return errors;
};

export type LimitInputError = 'pair' | 'making' | 'belowMinimum' | 'taking' | 'slippage' | 'expiry' | 'tooLarge';

export const validateLimitInput = (input: LimitOrderInput, rules: LimitRules, nowSeconds: number): LimitInputError[] => {
  const errors: LimitInputError[] = [];
  const duration = input.expiresAt - nowSeconds;

  if (!rules.tradable || input.inputToken === input.outputToken) {
    errors.push('pair');
  }

  if (!/^[1-9]\d*$/.test(input.makingAmount)) {
    errors.push('making');
  }
  else if (new BigNumber(input.makingAmount).isLessThan(rules.minMakingAmount)) {
    errors.push('belowMinimum');
  }

  if (!/^[1-9]\d*$/.test(input.takingAmount)) {
    errors.push('taking');
  }

  if (!Number.isInteger(input.slippageBps) || input.slippageBps < 0 || input.slippageBps > rules.maxSlippageBps) {
    errors.push('slippage');
  }

  if (duration < rules.minDuration || duration > rules.maxDuration) {
    errors.push('expiry');
  }

  if ([input.makingAmount, input.takingAmount].some(value => /^\d+$/.test(value) && BigInt(value) > MAX_ORDER_AMOUNT)) {
    errors.push('tooLarge');
  }

  return errors;
};

// Raw output for `making` raw input at `price` (display units of output per display unit of input), rounded down.
export const takingFromPrice = (making: string, price: string, inputDecimals: number, outputDecimals: number): string => {
  const value = new BigNumber(making).multipliedBy(price).shiftedBy(outputDecimals - inputDecimals).integerValue(BigNumber.ROUND_DOWN);

  return value.isFinite() && value.isGreaterThan(0) ? value.toFixed(0) : '0';
};

// Display price (output per input) of a raw input/output pair.
export const priceOf = (input: string, output: string, inputDecimals: number, outputDecimals: number): string | undefined => {
  const amountIn = new BigNumber(input);

  if (!amountIn.isGreaterThan(0)) {
    return undefined;
  }

  return new BigNumber(output).shiftedBy(inputDecimals - outputDecimals).dividedBy(amountIn).toFixed();
};

// The least the owner receives for the whole order once slippage is applied (the realm rounds each fill up).
export const limitMinimumOutput = (takingAmount: string, slippageBps: number): string =>
  new BigNumber(takingAmount).multipliedBy(10_000 - slippageBps).dividedBy(10_000).integerValue(BigNumber.ROUND_UP).toFixed(0);

export const OrderStatus = {
  ACTIVE: 'active',
  // DCA: every round ran; only the output is left to claim.
  COMPLETED: 'completed',
  EXPIRED: 'expired',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const orderStatus = (order: Order, nowSeconds: number): OrderStatus => {
  if (order.kind === OrderKind.DCA) {
    return order.executedCount >= order.executionCount ? OrderStatus.COMPLETED : OrderStatus.ACTIVE;
  }

  return order.expiresAt <= nowSeconds ? OrderStatus.EXPIRED : OrderStatus.ACTIVE;
};

// Share of the order done: rounds for DCA, filled input for limit orders.
export const orderProgress = (order: Order): number => {
  if (order.kind === OrderKind.DCA) {
    return order.executionCount > 0 ? Math.min(order.executedCount / order.executionCount, 1) : 0;
  }

  const making = new BigNumber(order.makingAmount);

  return making.isGreaterThan(0) ? Math.min(new BigNumber(order.filledInput).dividedBy(making).toNumber(), 1) : 0;
};

// Input still in escrow, refunded on cancel.
export const remainingInput = (order: Order): string => {
  if (order.kind === OrderKind.DCA) {
    const left = Math.max(order.executionCount - order.executedCount, 0);

    return new BigNumber(order.amountPerExecution).multipliedBy(left).toFixed(0);
  }

  return BigNumber.max(new BigNumber(order.makingAmount).minus(order.filledInput), 0).toFixed(0);
};
