import { OrderDetailView, OrderRowView, ReviewContent } from '../components/view-models';
import {
  dcaTotal,
  formatInterval,
  limitMinimumOutput,
  Order,
  OrderKind,
  orderProgress,
  OrderStatus,
  orderStatus,
  priceOf,
  remainingInput,
} from '../domain/order';
import { formatExpiry, formatRemaining, formatTimeLeft } from '../domain/session-card';
import { SwapToken } from '../domain/swap';
import { TokenType } from '../domain/token';
import { formatTokenAmount } from '../utils/amount';
import { BigNumber } from '../utils/big-number';

export interface OrderTokenInfo {
  symbol: string;
  decimals: number;
  // The order realms pay the native coin out as its wrapped token.
  wrapped: boolean;
}

// Order realms use registry keys; the native coin trades as its wrapped token.
export const orderTokenLookup = (tokens: SwapToken[], wrappedNativePath: string | undefined) => (path: string): OrderTokenInfo => {
  const native = tokens.find(token => token.type === TokenType.NATIVE);

  if (native && path === wrappedNativePath) {
    return { symbol: native.symbol, decimals: native.decimals, wrapped: true };
  }

  const token = tokens.find(item => item.swapPath === path);

  return token
    ? { symbol: token.symbol, decimals: token.decimals, wrapped: false }
    : { symbol: path.split('.').pop() ?? path, decimals: 0, wrapped: false };
};

type Lookup = (path: string) => OrderTokenInfo;

const amountLabel = (amount: string, token: OrderTokenInfo): string => `${formatTokenAmount(amount, token.decimals)} ${token.symbol}`;

const priceLabel = (input: string, output: string, inputToken: OrderTokenInfo, outputToken: OrderTokenInfo): string | undefined => {
  const price = priceOf(input, output, inputToken.decimals, outputToken.decimals);

  return price ? `${new BigNumber(price).toFormat(6, BigNumber.ROUND_DOWN).replace(/\.?0+$/, '')} ${outputToken.symbol} per ${inputToken.symbol}` : undefined;
};

export const orderKey = (order: Order): string => `${order.kind}:${order.id}`;

const WRAPPED_NOTE = 'Paid out as wrapped GNOT (wugnot)';

// Few enough rounds to draw one segment each.
const MAX_SEGMENTS = 20;

export const toOrderRowView = (order: Order, lookup: Lookup, nowSeconds: number): OrderRowView => {
  const input = lookup(order.inputToken);
  const output = lookup(order.outputToken);
  const status = orderStatus(order, nowSeconds);

  if (order.kind === OrderKind.DCA) {
    const claimable = new BigNumber(order.claimable).isGreaterThan(0);
    const next = order.nextExecutionAt > nowSeconds ? `Next in ${formatRemaining(order.nextExecutionAt - nowSeconds)}` : 'Next buy is due';

    return {
      id: orderKey(order),
      kind: order.kind,
      title: `Buy ${output.symbol}`,
      subtitle: `Recurring buy · ${amountLabel(order.amountPerExecution, input)} ${formatInterval(order.interval).toLowerCase()}`,
      progress: orderProgress(order),
      segments: order.executionCount <= MAX_SEGMENTS ? { total: order.executionCount, done: order.executedCount } : undefined,
      pillLabel: `${order.executedCount} of ${order.executionCount}`,
      footerLeft: `${amountLabel(remainingInput(order), input)} left`,
      footerRight: claimable ? `${amountLabel(order.claimable, output)} to claim` : status === OrderStatus.COMPLETED ? 'Completed' : next,
      claimable,
    };
  }

  return {
    id: orderKey(order),
    kind: order.kind,
    title: `Sell ${input.symbol}`,
    subtitle: `Limit order · ${priceLabel(order.makingAmount, order.takingAmount, input, output) ?? output.symbol}`,
    progress: orderProgress(order),
    pillLabel: `${Math.floor(orderProgress(order) * 100)}% filled`,
    footerLeft: `${amountLabel(remainingInput(order), input)} left`,
    footerRight: status === OrderStatus.EXPIRED ? 'Expired' : formatTimeLeft(order.expiresAt, nowSeconds),
    claimable: false,
  };
};

export const toOrderDetailView = (order: Order, lookup: Lookup, nowSeconds: number): OrderDetailView => {
  const input = lookup(order.inputToken);
  const output = lookup(order.outputToken);
  const row = toOrderRowView(order, lookup, nowSeconds);
  const refundLabel = amountLabel(remainingInput(order), input);

  if (order.kind === OrderKind.DCA) {
    return {
      row,
      tiles: [
        { icon: 'repeat', label: 'Each buy', value: amountLabel(order.amountPerExecution, input), caption: formatInterval(order.interval) },
        { icon: 'wallet', label: 'In escrow', value: refundLabel, caption: `of ${amountLabel(dcaTotal(order), input)}` },
        { icon: 'arrowUp', label: 'To claim', value: amountLabel(order.claimable, output) },
      ],
      rows: [],
      notes: [
        'GnoSwap keepers run each buy on schedule. A missed slot is skipped, not doubled up.',
        ...(output.wrapped ? [WRAPPED_NOTE] : []),
      ],
      canClaim: new BigNumber(order.claimable).isGreaterThan(0),
      cancelDescription: `Cancelling claims what was bought and returns ${refundLabel}.`,
    };
  }

  const received = BigNumber.max(new BigNumber(order.grossOutput).minus(order.executionFee), 0).toFixed(0);

  return {
    row,
    tiles: [
      { icon: 'gauge', label: 'Price', value: priceLabel(order.makingAmount, order.takingAmount, input, output) ?? '-' },
      { icon: 'wallet', label: 'Received', value: amountLabel(received, output) },
      { icon: 'clock', label: 'Expires', value: formatTimeLeft(order.expiresAt, nowSeconds), caption: formatExpiry(order.expiresAt) },
    ],
    rows: [
      { label: 'Selling', value: amountLabel(order.makingAmount, input) },
      { label: 'You get at least', value: amountLabel(limitMinimumOutput(order.takingAmount, order.slippageBps), output) },
      { label: 'Still in escrow', value: refundLabel },
    ],
    notes: [
      'GnoSwap keepers fill it when the pool reaches your price. Fills are paid to you right away.',
      'Unfilled input is returned automatically after it expires.',
      ...(output.wrapped ? [WRAPPED_NOTE] : []),
    ],
    canClaim: false,
    cancelDescription: `Cancelling returns ${refundLabel}.`,
  };
};

const ESCROW_ASSURANCE = 'Cancel any time. What was not used comes back to you.';

export interface DcaReviewInput {
  input: SwapToken;
  output: SwapToken;
  interval: number;
  amountPerExecution: string;
  executionCount: number;
  firstRoundAt: number;
  executionFeeBps?: number;
}

export const toDcaReview = (dca: DcaReviewInput, lookup: Lookup): ReviewContent => {
  const input = lookup(dca.input.swapPath);
  const output = lookup(dca.output.swapPath);
  const total = amountLabel(dcaTotal(dca), input);

  return {
    title: 'Start recurring buy',
    subtitle: `${amountLabel(dca.amountPerExecution, input)} → ${output.symbol}`,
    facts: [
      { icon: 'pin', label: 'Where', value: 'GnoSwap recurring buys' },
      { icon: 'repeat', label: 'How often', value: `${formatInterval(dca.interval)} · ${dca.executionCount} times` },
      { icon: 'clock', label: 'First buy', value: `Around ${formatExpiry(dca.firstRoundAt)}` },
    ],
    assurances: [ESCROW_ASSURANCE],
    rows: dca.executionFeeBps !== undefined ? [{ label: 'Execution fee', value: `${dca.executionFeeBps / 100}% of what is bought` }] : undefined,
    worstCase: { value: total, caption: '+ network fee' },
    warnings: output.wrapped ? [{ title: WRAPPED_NOTE }] : [],
    confirmLabel: `Hold to start · ${total}`,
  };
};

export interface LimitReviewInput {
  input: SwapToken;
  output: SwapToken;
  makingAmount: string;
  takingAmount: string;
  slippageBps: number;
  expiresAt: number;
}

export const toLimitReview = (limit: LimitReviewInput, lookup: Lookup): ReviewContent => {
  const input = lookup(limit.input.swapPath);
  const output = lookup(limit.output.swapPath);

  return {
    title: 'Place limit order',
    subtitle: `Sell ${input.symbol} for ${output.symbol}`,
    facts: [
      { icon: 'swap', label: 'Sell', value: amountLabel(limit.makingAmount, input) },
      { icon: 'gauge', label: 'Price', value: priceLabel(limit.makingAmount, limit.takingAmount, input, output) ?? '-' },
      { icon: 'wallet', label: 'You get at least', value: amountLabel(limitMinimumOutput(limit.takingAmount, limit.slippageBps), output) },
      { icon: 'clock', label: 'Expires', value: formatExpiry(limit.expiresAt) },
    ],
    assurances: [ESCROW_ASSURANCE, 'It never sells below your price'],
    worstCase: { value: amountLabel(limit.makingAmount, input), caption: '+ network fee' },
    warnings: output.wrapped ? [{ title: WRAPPED_NOTE }] : [],
    confirmLabel: 'Hold to place order',
  };
};

export const toClaimReview = (order: Order, lookup: Lookup): ReviewContent => {
  const output = lookup(order.outputToken);
  const amount = order.kind === OrderKind.DCA ? order.claimable : '0';

  return {
    title: 'Claim',
    facts: [{ icon: 'wallet', label: 'You receive', value: amountLabel(amount, output) }],
    warnings: output.wrapped ? [{ title: WRAPPED_NOTE }] : [],
    confirmLabel: 'Hold to claim',
  };
};

export const toCancelReview = (order: Order, lookup: Lookup): ReviewContent => ({
  title: 'Cancel order',
  facts: [
    { icon: 'wallet', label: 'Returned to you', value: amountLabel(remainingInput(order), lookup(order.inputToken)) },
    ...(order.kind === OrderKind.DCA && new BigNumber(order.claimable).isGreaterThan(0)
      ? [{ icon: 'arrowUp' as const, label: 'Also claimed', value: amountLabel(order.claimable, lookup(order.outputToken)) }]
      : []),
  ],
  warnings: [{ title: 'This cannot be undone' }],
  confirmLabel: 'Hold to cancel',
  destructive: true,
});
