import { OrderDetailView, OrderRowView } from '../components/view-models';
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
import { CardReviewContent } from './session-card.presenter';

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

export const toOrderRowView = (order: Order, lookup: Lookup, nowSeconds: number): OrderRowView => {
  const input = lookup(order.inputToken);
  const output = lookup(order.outputToken);
  const status = orderStatus(order, nowSeconds);

  if (order.kind === OrderKind.DCA) {
    const next = order.nextExecutionAt > nowSeconds ? `Next in ${formatRemaining(order.nextExecutionAt - nowSeconds)}` : 'Next buy is due';

    return {
      id: orderKey(order),
      kind: order.kind,
      title: `Buy ${output.symbol} with ${input.symbol}`,
      subtitle: `${amountLabel(order.amountPerExecution, input)} · ${formatInterval(order.interval)}`,
      progress: orderProgress(order),
      progressLabel: `${order.executedCount} of ${order.executionCount} buys`,
      statusLabel: status === OrderStatus.COMPLETED ? 'Completed' : next,
      claimLabel: new BigNumber(order.claimable).isGreaterThan(0) ? `${amountLabel(order.claimable, output)} to claim` : undefined,
    };
  }

  return {
    id: orderKey(order),
    kind: order.kind,
    title: `Sell ${input.symbol} for ${output.symbol}`,
    subtitle: priceLabel(order.makingAmount, order.takingAmount, input, output) ?? amountLabel(order.makingAmount, input),
    progress: orderProgress(order),
    progressLabel: `${Math.floor(orderProgress(order) * 100)}% filled`,
    statusLabel: status === OrderStatus.EXPIRED ? 'Expired' : formatTimeLeft(order.expiresAt, nowSeconds),
  };
};

export const toOrderDetailView = (order: Order, lookup: Lookup, nowSeconds: number): OrderDetailView => {
  const input = lookup(order.inputToken);
  const output = lookup(order.outputToken);
  const row = toOrderRowView(order, lookup, nowSeconds);
  const refundLabel = amountLabel(remainingInput(order), input);

  if (order.kind === OrderKind.DCA) {
    return {
      title: row.title,
      progress: row.progress,
      progressLabel: row.progressLabel,
      statusLabel: row.statusLabel,
      rows: [
        { label: 'Each buy', value: amountLabel(order.amountPerExecution, input) },
        { label: 'How often', value: formatInterval(order.interval) },
        { label: 'Total', value: amountLabel(dcaTotal(order), input) },
        { label: 'Still in escrow', value: refundLabel },
        { label: 'Ready to claim', value: amountLabel(order.claimable, output), emphasis: true },
      ],
      notes: [
        'GnoSwap keepers run each buy on schedule. A missed slot is skipped, not doubled up.',
        ...(output.wrapped ? [WRAPPED_NOTE] : []),
      ],
      canClaim: new BigNumber(order.claimable).isGreaterThan(0),
      cancelDescription: `Claims what was bought and returns ${refundLabel}.`,
    };
  }

  const received = BigNumber.max(new BigNumber(order.grossOutput).minus(order.executionFee), 0).toFixed(0);

  return {
    title: row.title,
    progress: row.progress,
    progressLabel: row.progressLabel,
    statusLabel: row.statusLabel,
    rows: [
      { label: 'Selling', value: amountLabel(order.makingAmount, input) },
      { label: 'Price', value: priceLabel(order.makingAmount, order.takingAmount, input, output) ?? '-' },
      { label: 'You get at least', value: amountLabel(limitMinimumOutput(order.takingAmount, order.slippageBps), output) },
      { label: 'Received so far', value: amountLabel(received, output), emphasis: true },
      { label: 'Still in escrow', value: refundLabel },
      { label: 'Expires', value: `${formatExpiry(order.expiresAt)} · ${formatTimeLeft(order.expiresAt, nowSeconds)}` },
    ],
    notes: [
      'GnoSwap keepers fill it when the pool reaches your price. Fills are paid to you right away.',
      'Unfilled input is returned automatically after it expires.',
      ...(output.wrapped ? [WRAPPED_NOTE] : []),
    ],
    canClaim: false,
    cancelDescription: `Returns ${refundLabel}.`,
  };
};

const ESCROW_WARNING = { title: 'Held by GnoSwap until it runs', description: 'The order contract keeps the input until it is used, claimed or cancelled.' };

export interface DcaReviewInput {
  input: SwapToken;
  output: SwapToken;
  interval: number;
  amountPerExecution: string;
  executionCount: number;
  firstRoundAt: number;
  executionFeeBps?: number;
}

export const toDcaReview = (dca: DcaReviewInput, lookup: Lookup): CardReviewContent => {
  const output = lookup(dca.output.swapPath);

  return {
    title: 'Start recurring buy',
    rows: [
      { label: 'Buy', value: dca.output.symbol },
      { label: 'Each buy', value: `${formatTokenAmount(dca.amountPerExecution, dca.input.decimals)} ${dca.input.symbol}` },
      { label: 'How often', value: `${formatInterval(dca.interval)} · ${dca.executionCount} times` },
      { label: 'First buy', value: `Around ${formatExpiry(dca.firstRoundAt)}` },
      { label: 'Total', value: `${formatTokenAmount(dcaTotal(dca), dca.input.decimals)} ${dca.input.symbol}`, emphasis: true },
      ...(dca.executionFeeBps !== undefined ? [{ label: 'Execution fee', value: `${dca.executionFeeBps / 100}% of what is bought` }] : []),
    ],
    warnings: [ESCROW_WARNING, ...(output.wrapped ? [{ title: WRAPPED_NOTE }] : [])],
    confirmLabel: 'Hold to start',
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

export const toLimitReview = (limit: LimitReviewInput, lookup: Lookup): CardReviewContent => {
  const input = lookup(limit.input.swapPath);
  const output = lookup(limit.output.swapPath);

  return {
    title: 'Place limit order',
    rows: [
      { label: 'Sell', value: amountLabel(limit.makingAmount, input) },
      { label: 'Price', value: priceLabel(limit.makingAmount, limit.takingAmount, input, output) ?? '-' },
      { label: 'You get at least', value: amountLabel(limitMinimumOutput(limit.takingAmount, limit.slippageBps), output), emphasis: true },
      { label: 'Expires', value: formatExpiry(limit.expiresAt) },
    ],
    warnings: [ESCROW_WARNING, ...(output.wrapped ? [{ title: WRAPPED_NOTE }] : [])],
    confirmLabel: 'Hold to place order',
  };
};

export const toClaimReview = (order: Order, lookup: Lookup): CardReviewContent => {
  const output = lookup(order.outputToken);
  const amount = order.kind === OrderKind.DCA ? order.claimable : '0';

  return {
    title: 'Claim',
    rows: [{ label: 'You receive', value: amountLabel(amount, output), emphasis: true }],
    warnings: output.wrapped ? [{ title: WRAPPED_NOTE }] : [],
    confirmLabel: 'Hold to claim',
  };
};

export const toCancelReview = (order: Order, lookup: Lookup): CardReviewContent => ({
  title: 'Cancel order',
  rows: [
    { label: 'Returned to you', value: amountLabel(remainingInput(order), lookup(order.inputToken)), emphasis: true },
    ...(order.kind === OrderKind.DCA && new BigNumber(order.claimable).isGreaterThan(0)
      ? [{ label: 'Also claimed', value: amountLabel(order.claimable, lookup(order.outputToken)) }]
      : []),
  ],
  warnings: [{ title: 'This cannot be undone' }],
  confirmLabel: 'Hold to cancel',
  destructive: true,
});
