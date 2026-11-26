import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React, { ReactElement, useMemo, useState } from 'react';

import { OrderCreatePage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import {
  DcaRules,
  dcaTotal,
  formatInterval,
  LIMIT_DURATIONS,
  LIMIT_SLIPPAGE_OPTIONS_BPS,
  limitMinimumOutput,
  LimitRules,
  OrderKind,
  priceOf,
  takingFromPrice,
  validateDcaInput,
  validateLimitInput,
} from '../../../domain/order';
import { formatDuration } from '../../../domain/session-card';
import { SwapToken } from '../../../domain/swap';
import { TokenType } from '../../../domain/token';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { useOrderTransaction } from '../../../hooks/use-reviewed-transaction';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { orderTokenLookup, toDcaReview, toLimitReview } from '../../../presenters/order.presenter';
import { useOrderBalancesQuery, useOrderTokensQuery } from '../../../queries/order.queries';
import { queryKeys } from '../../../queries/query-keys';
import { compareAmount, formatTokenAmount, isPositiveAmount, toBaseUnit } from '../../../utils/amount';
import { BigNumber } from '../../../utils/big-number';

const DECIMAL_INPUT = /^\d*(?:\.\d*)?$/;
const INTEGER_INPUT = /^\d*$/;
const DAY = 86_400;
const DEFAULT_COUNT = '10';
const QUOTE_DEBOUNCE_MS = 400;

type Side = 'input' | 'output';

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

const acceptsDecimal = (value: string, decimals: number): boolean =>
  DECIMAL_INPUT.test(value) && (value.split('.')[1]?.length ?? 0) <= decimals;

const formatPrice = (price: string): string => new BigNumber(price).decimalPlaces(8, BigNumber.ROUND_DOWN).toFixed();

export const OrderCreateScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'OrderCreate'>): ReactElement => {
  const { kind } = route.params;
  const dca = kind === OrderKind.DCA;
  const { orderService, swapService } = useContainer();
  const { account, network } = useWalletSnapshot();
  const swapConfig = swapService.getSwapConfig(network);
  const tokensQuery = useOrderTokensQuery(network);
  const tokens = useMemo(() => tokensQuery.data ?? [], [tokensQuery.data]);
  const balancesQuery = useOrderBalancesQuery(account, network, tokens);
  const lookup = useMemo(() => orderTokenLookup(tokens, swapConfig?.wrappedNative.tokenPath), [tokens, swapConfig]);

  // DCA buys the first popular token with the native coin; a limit order sells it for the native coin.
  const nativeId = tokens.find(token => token.type === TokenType.NATIVE)?.id;
  const popularId = swapConfig?.popularTokens.find(id => id !== nativeId && tokens.some(token => token.id === id));
  const [inputId, setInputId] = useState<string>();
  const [outputId, setOutputId] = useState<string>();
  const input = tokens.find(token => token.id === (inputId ?? (dca ? nativeId : popularId)));
  const output = tokens.find(token => token.id === (outputId ?? (dca ? popularId : nativeId)));
  const [sheetSide, setSheetSide] = useState<Side | null>(null);

  const [amount, setAmount] = useState('');
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [intervalChoice, setIntervalChoice] = useState<number>();
  const [price, setPrice] = useState('');
  const [slippageBps, setSlippageBps] = useState(LIMIT_SLIPPAGE_OPTIONS_BPS[0]);
  const [duration, setDuration] = useState(7 * DAY);

  const pairReady = Boolean(input && output && input.id !== output.id);
  const rulesQuery = useQuery<DcaRules | LimitRules>({
    queryKey: queryKeys.orderRules(network.id, kind, input?.id ?? '', output?.id ?? ''),
    queryFn: () => (dca ? orderService.getDcaRules(network, input as SwapToken, output as SwapToken) : orderService.getLimitRules(network, input as SwapToken, output as SwapToken)),
    enabled: pairReady,
  });
  const dcaRules = dca ? rulesQuery.data as DcaRules | undefined : undefined;
  const limitRules = dca ? undefined : rulesQuery.data as LimitRules | undefined;

  const inputDecimals = input?.decimals ?? 0;
  const outputDecimals = output?.decimals ?? 0;
  const rawAmount = isPositiveAmount(amount) ? toBaseUnit(amount, inputDecimals) : '0';
  const balance = input ? balancesQuery.data?.[input.id] : undefined;
  const selectedInterval = intervalChoice ?? dcaRules?.intervals.find(value => value >= DAY) ?? dcaRules?.intervals[0];
  const executionCount = Number(count || '0');
  const takingAmount = isPositiveAmount(price) ? takingFromPrice(rawAmount, price, inputDecimals, outputDecimals) : '0';
  const durations = LIMIT_DURATIONS.filter(value => !limitRules || (value >= limitRules.minDuration && value <= limitRules.maxDuration));
  const selectedDuration = durations.includes(duration) ? duration : durations[0] ?? duration;
  const escrow = dca ? dcaTotal({ amountPerExecution: rawAmount, executionCount: Number.isInteger(executionCount) ? executionCount : 0 }) : rawAmount;
  const exceedsBalance = balance !== undefined && compareAmount(escrow, balance) > 0;

  // Market price for the amount being sold, as a starting point for the limit price.
  const quoteAmount = useDebouncedValue(rawAmount !== '0' ? rawAmount : input ? new BigNumber(10).pow(input.decimals).toFixed(0) : '0', QUOTE_DEBOUNCE_MS);
  const marketQuery = useQuery({
    queryKey: [...queryKeys.all, 'order-market', network.id, input?.id ?? '', output?.id ?? '', quoteAmount],
    queryFn: () => orderService.marketOutput(network, input as SwapToken, output as SwapToken, quoteAmount),
    enabled: !dca && pairReady && quoteAmount !== '0',
  });
  const marketPrice = marketQuery.data ? priceOf(quoteAmount, marketQuery.data, inputDecimals, outputDecimals) : undefined;

  const errors = useMemo((): string[] | null => {
    if (!input || !output || !rulesQuery.data) {
      return null;
    }

    return dca
      ? validateDcaInput({ inputToken: input.swapPath, outputToken: output.swapPath, interval: selectedInterval ?? 0, amountPerExecution: rawAmount, executionCount }, rulesQuery.data as DcaRules)
      : validateLimitInput({ inputToken: input.swapPath, outputToken: output.swapPath, makingAmount: rawAmount, takingAmount, slippageBps, expiresAt: nowSeconds() + selectedDuration }, rulesQuery.data as LimitRules, nowSeconds());
  }, [dca, input, output, rulesQuery.data, selectedInterval, rawAmount, executionCount, takingAmount, slippageBps, selectedDuration]);

  const tradable = rulesQuery.data?.tradable;
  const minimum = dca ? dcaRules?.minAmountPerExecution : limitRules?.minMakingAmount;
  const amountError = !isPositiveAmount(amount)
    ? undefined
    : exceedsBalance
      ? 'Insufficient balance'
      : errors?.some(error => error === 'belowMinimum') && minimum && input
        ? `At least ${formatTokenAmount(minimum, input.decimals)} ${input.symbol}`
        : undefined;

  const order = useOrderTransaction(dca ? 'Recurring buy started' : 'Limit order placed', () => navigation.goBack());

  const handleReview = (): void => {
    if (!account || !input || !output) {
      return;
    }

    order.start(() => (dca
      ? orderService.prepareDca(account, network, { input, output, interval: selectedInterval ?? 0, amountPerExecution: rawAmount, executionCount })
      : orderService.prepareLimit(account, network, { input, output, makingAmount: rawAmount, takingAmount, slippageBps, duration: selectedDuration })));
  };

  const handleSelectToken = (id: string): void => {
    const other = sheetSide === 'input' ? output : input;

    // Picking the other side's token swaps the pair instead of making it the same on both sides.
    if (sheetSide === 'input') {
      setInputId(id);

      if (other?.id === id) {
        setOutputId(input?.id);
      }
    }
    else {
      setOutputId(id);

      if (other?.id === id) {
        setInputId(output?.id);
      }
    }

    setSheetSide(null);
    setPrice('');
  };

  const handleChangeAmount = (value: string): void => {
    const normalized = value.replace(',', '.');

    if (acceptsDecimal(normalized, inputDecimals)) {
      setAmount(normalized);
    }
  };

  const handleChangeCount = (value: string): void => {
    if (INTEGER_INPUT.test(value)) {
      setCount(value);
    }
  };

  const handleChangePrice = (value: string): void => {
    const normalized = value.replace(',', '.');

    if (DECIMAL_INPUT.test(normalized)) {
      setPrice(normalized);
    }
  };

  const handleUseMarketPrice = (): void => {
    if (marketPrice) {
      setPrice(formatPrice(marketPrice));
    }
  };

  const summary = ((): { label: string; value: string }[] => {
    if (!input || !output || rawAmount === '0') {
      return [];
    }

    if (dca) {
      return executionCount > 0 && selectedInterval
        ? [
            { label: 'Total set aside', value: `${formatTokenAmount(escrow, input.decimals)} ${input.symbol}` },
            { label: 'Runs for', value: formatDuration(executionCount * selectedInterval) },
          ]
        : [];
    }

    return takingAmount !== '0'
      ? [{ label: 'You get at least', value: `${formatTokenAmount(limitMinimumOutput(takingAmount, slippageBps), output.decimals)} ${output.symbol}` }]
      : [];
  })();

  const tokenOptions = tokens.map(token => ({
    id: token.id,
    symbol: token.symbol,
    name: token.name,
    balanceLabel: balancesQuery.data?.[token.id] !== undefined ? formatTokenAmount(balancesQuery.data[token.id], token.decimals) : undefined,
  }));

  const prepared = order.prepared;
  const review = prepared?.dca
    ? toDcaReview({ ...prepared.dca, executionFeeBps: dcaRules?.executionFeeBps }, lookup)
    : prepared?.limit ? toLimitReview(prepared.limit, lookup) : undefined;

  return (
    <OrderCreatePage
      kind={kind}
      onBack={navigation.goBack}
      inputLabel={input?.symbol}
      inputBalanceLabel={input && balance !== undefined ? `${formatTokenAmount(balance, input.decimals)} ${input.symbol}` : undefined}
      outputLabel={output?.symbol}
      onPickInput={() => setSheetSide('input')}
      onPickOutput={() => setSheetSide('output')}
      tokenSheet={{
        visible: sheetSide !== null,
        title: sheetSide === 'input' ? (dca ? 'Pay with' : 'Sell') : (dca ? 'Buy' : 'For'),
        options: tokenOptions,
        onSelect: handleSelectToken,
        onClose: () => setSheetSide(null),
      }}
      tokensError={tokensQuery.error ? toErrorMessage(tokensQuery.error) : undefined}
      checkingRules={pairReady && rulesQuery.isPending}
      rulesNotice={rulesQuery.error
        ? toErrorMessage(rulesQuery.error)
        : tradable === false
          ? (dca ? 'GnoSwap does not run recurring buys for this pair yet.' : 'GnoSwap does not take limit orders for this pair yet.')
          : undefined}
      amount={amount}
      amountLabel={dca ? `Each buy (${input?.symbol ?? ''})` : `Sell amount (${input?.symbol ?? ''})`}
      amountError={amountError}
      onChangeAmount={handleChangeAmount}
      count={count}
      countError={dca && errors?.includes('count') && count !== '' ? `Between 1 and ${dcaRules?.maxExecutionCount ?? 1}` : undefined}
      onChangeCount={handleChangeCount}
      intervals={dcaRules?.intervals.map(value => ({ key: value, label: formatInterval(value), selected: value === selectedInterval }))}
      onSelectInterval={setIntervalChoice}
      price={price}
      priceLabel={input && output ? `Price (${output.symbol} per ${input.symbol})` : 'Price'}
      onChangePrice={handleChangePrice}
      marketPriceLabel={marketPrice ? formatPrice(marketPrice) : undefined}
      onUseMarketPrice={handleUseMarketPrice}
      slippages={limitRules
        ? LIMIT_SLIPPAGE_OPTIONS_BPS.filter(bps => bps <= limitRules.maxSlippageBps).map(bps => ({ key: bps, label: `${bps / 100}%`, selected: bps === slippageBps }))
        : undefined}
      onSelectSlippage={setSlippageBps}
      durations={durations.map(value => ({ key: value, label: formatDuration(value), selected: value === selectedDuration }))}
      onSelectDuration={setDuration}
      summary={summary}
      canReview={Boolean(errors && errors.length === 0) && !exceedsBalance && order.canSend}
      preparing={order.preparing}
      error={order.prepareError ?? order.notice}
      onReview={handleReview}
      review={{
        review: review ? { ...review, fee: order.fee } : undefined,
        confirming: order.confirming,
        error: order.confirmError,
        onConfirm: order.confirm,
        onClose: order.close,
      }}
    />
  );
};
