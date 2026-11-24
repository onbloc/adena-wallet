import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useCallback, useMemo, useRef, useState } from 'react';

import { applyKeypadKey, KeypadKey } from '../../../components/molecules';
import { SwapDetailsView, SwapPage, SwapPercent, SwapReviewView, SwapTokenView } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { AppErrorCode, isAppError } from '../../../core/errors';
import { useContainer } from '../../../di/container-provider';
import { HapticKind } from '../../../domain/haptics';
import {
  AUTO_SLIPPAGE_PERCENT,
  effectiveSlippage,
  HIGH_SLIPPAGE_PERCENT,
  isValidDeadline,
  isValidSlippage,
  minAmountOut,
  routerFeeOf,
  slippageToBps,
  SwapSettings,
  SwapToken,
} from '../../../domain/swap';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { useFeeSelection } from '../../../hooks/use-fee-selection';
import { useHaptics } from '../../../hooks/use-haptics';
import { usePendingBroadcast } from '../../../hooks/use-pending-broadcast';
import { usePreference } from '../../../hooks/use-preference';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import {
  buildRouteViews,
  displayAmount,
  formatPercent,
  formatPriceImpact,
  formatSwapAmount,
  formatSwapRate,
  isHighPriceImpact,
  SwapAction,
  swapActionState,
  SwapQuoteStatus,
} from '../../../presenters/swap.presenter';
import { NO_ID_KEY, queryKeys } from '../../../queries/query-keys';
import { PreparedSwap, SwapMaxResult } from '../../../services/swap.service';
import { useToastStore } from '../../../stores/toast.store';
import { formatPackagePath } from '../../../utils/address';
import { compareAmount, formatTokenAmount, isPositiveAmount, toBaseUnit, toDisplayAmount } from '../../../utils/amount';
import { formatUSD } from '../../../utils/price';

type Side = 'sell' | 'buy';

const QUOTE_DEBOUNCE_MS = 400;
const QUOTE_STALE_MS = 15_000;
const QUOTE_REFRESH_MS = 30_000;
const TOKENS_STALE_MS = 5 * 60_000;
const SUGGESTION_COUNT = 4;

const matches = (token: SwapToken, query: string): boolean => {
  const needle = query.trim().toLowerCase();

  return !needle || [token.name, token.symbol, token.id, token.swapPath].some(value => value.toLowerCase().includes(needle));
};

// Volume first (the list is "by 24H volume"), then held tokens, then symbol.
export const sortSwapTokens = (tokens: SwapToken[], balances?: Record<string, string>): SwapToken[] =>
  [...tokens].sort((a, b) =>
    (b.volume24hUsd ?? 0) - (a.volume24hUsd ?? 0)
    || Number(compareAmount(balances?.[b.id] ?? '0', '0') > 0) - Number(compareAmount(balances?.[a.id] ?? '0', '0') > 0)
    || a.symbol.localeCompare(b.symbol));

export const searchSwapTokens = (tokens: SwapToken[], query: string): SwapToken[] => tokens.filter(token => matches(token, query));

// Raw share of the balance, capped at the spendable maximum (the native coin's balance minus fee and deposit).
export const percentOfBalance = (balance: string, percent: SwapPercent, cap?: string): string => {
  const share = (BigInt(balance) * BigInt(percent)) / 100n;
  const limit = cap === undefined ? share : BigInt(cap);

  return (share < limit ? share : limit > 0n ? limit : 0n).toString();
};

const parseSlippageText = (text: string): number | null => (/^\d{1,2}(\.\d{1,2})?$/.test(text.trim()) ? Number(text) : null);

const parseDeadlineText = (text: string): number | null => (/^\d{1,3}$/.test(text.trim()) ? Number(text) : null);

export const SwapScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'Swap'>): ReactElement => {
  const { swapService, preferenceService } = useContainer();
  const { account, network } = useWalletSnapshot();
  const queryClient = useQueryClient();
  const showToast = useToastStore(state => state.show);
  const playHaptic = useHaptics();
  const supported = swapService.isSupported(network);
  const swapConfig = swapService.getSwapConfig(network);

  const slippagePreference = usePreference('swapSlippage');
  const deadlinePreference = usePreference('swapDeadlineMinutes');
  const settings: SwapSettings = useMemo(
    () => ({ slippage: slippagePreference, deadlineMinutes: deadlinePreference }),
    [deadlinePreference, slippagePreference],
  );

  const [inputId, setInputId] = useState<string | undefined>(route.params?.inputTokenId ?? network.nativeToken.id);
  const [outputId, setOutputId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [sheetSide, setSheetSide] = useState<Side | null>(null);
  const [query, setQuery] = useState('');
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [draftAuto, setDraftAuto] = useState(true);
  const [slippageText, setSlippageText] = useState('');
  const [deadlineText, setDeadlineText] = useState('');
  const [prepared, setPrepared] = useState<PreparedSwap | null>(null);
  // Native max per input/output/balance; an edit bumps the epoch so a late estimate is dropped.
  const [maxCache, setMaxCache] = useState<{ key: string; result: SwapMaxResult } | null>(null);
  const [maxPercent, setMaxPercent] = useState<SwapPercent | null>(null);
  const [maxError, setMaxError] = useState<string>();
  const [maxApproximate, setMaxApproximate] = useState(false);
  const maxEpochRef = useRef(0);
  const sendingRef = useRef(false);
  const feeSelection = useFeeSelection(prepared?.estimate ?? null, network);

  const tokensQuery = useQuery({
    queryKey: queryKeys.swapTokens(network.id),
    queryFn: () => swapService.getTokens(network),
    enabled: supported,
    staleTime: TOKENS_STALE_MS,
  });
  const tokens = useMemo(() => tokensQuery.data ?? [], [tokensQuery.data]);
  const tokenIds = useMemo(() => tokens.map(token => token.id), [tokens]);
  const balancesQuery = useQuery({
    queryKey: queryKeys.swapBalances(network.id, account?.id ?? NO_ID_KEY, tokenIds),
    queryFn: () => swapService.getBalances(account!, network, tokens),
    enabled: supported && Boolean(account) && tokens.length > 0,
  });
  const balances = balancesQuery.data;

  const input = tokens.find(token => token.id === inputId);
  const output = tokens.find(token => token.id === outputId);
  const amountRaw = useMemo(() => (input && isPositiveAmount(amount) ? toBaseUnit(amount, input.decimals) : '0'), [amount, input]);
  const debouncedRaw = useDebouncedValue(amountRaw, QUOTE_DEBOUNCE_MS);
  const inputBalance = input ? balances?.[input.id] : undefined;
  const hasAmount = amountRaw !== '0';
  const insufficient = inputBalance !== undefined && hasAmount && compareAmount(amountRaw, inputBalance) > 0;
  const minDeposit = swapConfig?.wrappedNative.minDeposit;
  const belowMinimum = Boolean(input?.isNative && hasAmount && minDeposit && compareAmount(amountRaw, minDeposit) < 0);
  const sameToken = Boolean(input && output && input.swapPath === output.swapPath);
  const quoteEnabled = supported && Boolean(input && output) && !sameToken && !belowMinimum && debouncedRaw !== '0' && debouncedRaw === amountRaw;

  const quoteQuery = useQuery({
    queryKey: queryKeys.swapQuote(network.id, input?.id ?? NO_ID_KEY, output?.id ?? NO_ID_KEY, debouncedRaw),
    queryFn: () => swapService.getQuote({ network, input: input!, output: output!, amountIn: debouncedRaw }),
    enabled: quoteEnabled && !prepared,
    staleTime: QUOTE_STALE_MS,
    refetchInterval: prepared ? false : QUOTE_REFRESH_MS,
    retry: false,
  });
  // A quote for another amount or pair (kept by the query while refetching) is never shown or used.
  const quote = quoteQuery.data && quoteQuery.data.amountIn === amountRaw && quoteQuery.data.inputTokenId === input?.id
    && quoteQuery.data.outputTokenId === output?.id
    ? quoteQuery.data
    : undefined;
  const quoteStatus = ((): SwapQuoteStatus => {
    if (quote) {
      return SwapQuoteStatus.READY;
    }

    if (quoteQuery.isError && quoteEnabled && !quoteQuery.isFetching) {
      return isAppError(quoteQuery.error, AppErrorCode.SWAP_NO_ROUTE) ? SwapQuoteStatus.NO_ROUTE : SwapQuoteStatus.ERROR;
    }

    return quoteQuery.isFetching || amountRaw !== debouncedRaw ? SwapQuoteStatus.LOADING : SwapQuoteStatus.IDLE;
  })();

  const fiatOf = useCallback((raw: string, token?: SwapToken): string | undefined => {
    if (!token?.priceUsd || raw === '0') {
      return undefined;
    }

    return `≈ ${formatUSD(Number(displayAmount(raw, token.decimals)) * token.priceUsd)}`;
  }, []);

  const toView = useCallback((token: SwapToken): SwapTokenView => {
    const balance = balances?.[token.id];

    return {
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      localIcon: token.localIcon,
      imageUrl: token.imageUrl,
      pathLabel: token.isNative ? undefined : formatPackagePath(token.id),
      balanceLabel: balance !== undefined && compareAmount(balance, '0') > 0 ? formatTokenAmount(balance, token.decimals, 6) : undefined,
      fiatLabel: balance !== undefined ? fiatOf(balance, token) : undefined,
      verified: token.verified,
    };
  }, [balances, fiatOf]);

  const handleCommitted = useCallback((): void => {
    queryClient.invalidateQueries({ queryKey: queryKeys.balances() });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'activities'] });
    playHaptic(HapticKind.SUCCESS);
    showToast('Swap confirmed', 'success');
    setPrepared(null);
    setAmount('');
  }, [playHaptic, queryClient, showToast]);

  const pendingBroadcast = usePendingBroadcast(handleCommitted);

  // Edits detach the in-flight estimate through reset(), like the send flow.
  const prepare = useMutation({
    mutationFn: async (): Promise<PreparedSwap> => {
      if (!account || !input || !output || !quote) {
        throw new Error('Select tokens and an amount');
      }

      return swapService.prepare({ account, network, input, output, quote, settings });
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!prepared || !feeSelection.fee) {
        throw new Error('Nothing to swap');
      }

      return swapService.submit(prepared, { gasWanted: feeSelection.fee.gasWanted, gasFee: feeSelection.fee.gasFee });
    },
    onSuccess: handleCommitted,
  });

  const action = swapActionState({
    supported,
    input,
    output,
    hasAmount,
    insufficient,
    belowMinimumLabel: belowMinimum && input && minDeposit ? `${toDisplayAmount(minDeposit, input.decimals)} ${input.symbol}` : undefined,
    sameToken,
    quoteStatus,
    canSend: pendingBroadcast.canSend,
    preparing: prepare.isPending,
  });

  const resetQuoteState = (): void => {
    prepare.reset();
    maxEpochRef.current += 1;
    setMaxPercent(null);
    setMaxError(undefined);
    setMaxApproximate(false);
  };

  const maxKey = input ? `${network.id}|${account?.id ?? ''}|${input.id}|${output?.id ?? ''}|${inputBalance ?? ''}` : '';

  const handleKeyPress = (key: KeypadKey): void => {
    resetQuoteState();
    setAmount(current => applyKeypadKey(current, key, input?.decimals ?? 6));
  };

  const handlePercent = (percent: SwapPercent): void => {
    if (!input || inputBalance === undefined) {
      return;
    }

    resetQuoteState();

    const apply = (result?: SwapMaxResult): void => {
      const raw = percentOfBalance(inputBalance, percent, result?.amount);

      setMaxApproximate(Boolean(result?.approximate) && raw === result?.amount);
      setAmount(raw === '0' ? '' : toDisplayAmount(raw, input.decimals));
    };

    if (!input.isNative) {
      apply();
      return;
    }

    if (maxCache?.key === maxKey) {
      apply(maxCache.result);
      return;
    }

    if (!account) {
      return;
    }

    const epoch = maxEpochRef.current;
    const key = maxKey;

    setMaxPercent(percent);
    swapService.maxInputAmount({ account, network, input, output, balance: inputBalance, settings })
      .then((result) => {
        if (epoch !== maxEpochRef.current) {
          return;
        }

        setMaxCache({ key, result });
        apply(result);
      })
      .catch((failure: unknown) => {
        if (epoch !== maxEpochRef.current) {
          return;
        }

        setAmount('');
        setMaxError(toErrorMessage(failure));
      })
      .finally(() => {
        if (epoch === maxEpochRef.current) {
          setMaxPercent(null);
        }
      });
  };

  const handleFlip = (): void => {
    resetQuoteState();
    playHaptic(HapticKind.SELECTION);
    // The received amount becomes the new amount to sell.
    setAmount(quote && output ? toDisplayAmount(quote.amountOut, output.decimals) : amount);
    setInputId(outputId);
    setOutputId(inputId);
  };

  const selectToken = (side: Side, tokenId: string): void => {
    resetQuoteState();

    if (side === 'sell') {
      if (tokenId === outputId) {
        setOutputId(inputId);
      }

      if (tokenId !== inputId) {
        setAmount('');
      }

      setInputId(tokenId);
    }
    else {
      if (tokenId === inputId) {
        setInputId(outputId);
        setAmount('');
      }

      setOutputId(tokenId);
    }

    setSheetSide(null);
    setQuery('');
  };

  const handleAction = (): void => {
    if (action.action === SwapAction.RETRY) {
      void quoteQuery.refetch();
      return;
    }

    if (action.action !== SwapAction.REVIEW || !pendingBroadcast.canSend) {
      return;
    }

    prepare.mutate(undefined, {
      onSuccess: (result) => {
        feeSelection.reset();
        setPrepared(result);
      },
      onError: (error) => {
        // An expired or moved quote is simply fetched again.
        if (isAppError(error, AppErrorCode.SWAP_PRICE_MOVED)) {
          void quoteQuery.refetch();
        }
      },
    });
  };

  // isPending reaches the button a tick after mutate(); the ref blocks a second tap in between.
  const handleConfirm = (): void => {
    if (sendingRef.current || !prepared) {
      return;
    }

    const sentNetwork = prepared.network;

    sendingRef.current = true;
    submit.mutateAsync()
      .catch((error) => {
        // Unknown outcome: close the review so the same swap cannot be confirmed again.
        if (pendingBroadcast.track(error, sentNetwork)) {
          submit.reset();
          setPrepared(null);
        }
      })
      .finally(() => {
        sendingRef.current = false;
      });
  };

  const handleCloseReview = (): void => {
    submit.reset();
    setPrepared(null);
  };

  const openSettings = (): void => {
    setDraftAuto(settings.slippage === null);
    setSlippageText(settings.slippage === null ? '' : String(settings.slippage));
    setDeadlineText(String(settings.deadlineMinutes));
    setSettingsVisible(true);
  };

  const parsedSlippage = parseSlippageText(slippageText);
  const parsedDeadline = parseDeadlineText(deadlineText);
  const slippageError = !draftAuto && slippageText.length > 0 && !isValidSlippage(parsedSlippage)
    ? 'Enter 0.01% to 50% with up to two decimals.'
    : undefined;
  const slippageWarning = ((): string | undefined => {
    if (draftAuto || parsedSlippage === null || !isValidSlippage(parsedSlippage)) {
      return undefined;
    }

    if (parsedSlippage > HIGH_SLIPPAGE_PERCENT) {
      return 'High slippage: you may receive much less than quoted.';
    }

    return parsedSlippage < 0.05 ? 'Very low slippage: the swap may fail.' : undefined;
  })();
  const deadlineError = deadlineText.length > 0 && !isValidDeadline(parsedDeadline) ? 'Enter 1 to 180 minutes.' : undefined;
  const canSaveSettings = isValidDeadline(parsedDeadline) && (draftAuto || isValidSlippage(parsedSlippage));

  const saveSettings = (): void => {
    if (!canSaveSettings) {
      return;
    }

    resetQuoteState();
    preferenceService.update({ swapSlippage: draftAuto ? null : parsedSlippage, swapDeadlineMinutes: parsedDeadline as number });
    setSettingsVisible(false);
  };

  const slippagePercent = effectiveSlippage(settings);
  const slippageLabel = settings.slippage === null ? `Auto ${formatPercent(AUTO_SLIPPAGE_PERCENT)}` : formatPercent(slippagePercent);
  const quoteMin = quote ? minAmountOut(quote.amountOut, slippageToBps(slippagePercent)) : undefined;

  const details: SwapDetailsView | undefined = quote && input && output && quoteMin
    ? {
        rateLabel: formatSwapRate(quote, input, output),
        priceImpactLabel: formatPriceImpact(quote.priceImpactPercent),
        priceImpactHigh: isHighPriceImpact(quote.priceImpactPercent),
        slippageLabel,
        minReceivedLabel: `${formatSwapAmount(displayAmount(quoteMin, output.decimals))} ${output.symbol}`,
        routerFeeLabel: `${formatPercent(quote.routerFeeBps / 100)} · ${formatSwapAmount(displayAmount(routerFeeOf(quote.amountOut, quote.routerFeeBps), output.decimals))} ${output.symbol}`,
        routes: buildRouteViews(quote, tokens),
      }
    : undefined;

  const review: SwapReviewView | undefined = useMemo(() => {
    if (!prepared || !feeSelection.fee) {
      return undefined;
    }

    const { input: paid, output: received, quote: signed } = prepared;
    const outLabel = `${formatSwapAmount(displayAmount(signed.amountOut, received.decimals))} ${received.symbol}`;
    const minLabel = `${formatSwapAmount(displayAmount(prepared.minAmountOut, received.decimals))} ${received.symbol}`;
    const routeLabel = buildRouteViews(signed, tokens)
      .map(view => `${view.share} ${view.steps.map(step => (step.fee ? `› ${step.symbol} (${step.fee})` : step.symbol)).join(' ')}`)
      .join('\n');
    const warnings = [
      isHighPriceImpact(signed.priceImpactPercent) ? `High price impact (${formatPriceImpact(signed.priceImpactPercent)}).` : undefined,
      received.isNative ? `At least ${minLabel} arrives as ${received.symbol}; anything above it stays wrapped as wugnot.` : undefined,
    ].filter(Boolean);

    return {
      pay: { token: toView(paid), amountLabel: `${formatTokenAmount(signed.amountIn, paid.decimals)} ${paid.symbol}`, fiatLabel: fiatOf(signed.amountIn, paid) },
      receive: { token: toView(received), amountLabel: outLabel, fiatLabel: fiatOf(signed.amountOut, received) },
      rows: [
        { label: 'Min. received', value: minLabel, emphasis: true },
        { label: 'Rate', value: formatSwapRate(signed, paid, received) ?? '—' },
        { label: 'Price impact', value: formatPriceImpact(signed.priceImpactPercent) },
        { label: 'Max. slippage', value: formatPercent(prepared.slippageBps / 100) },
        { label: 'Route', value: routeLabel, multiline: true },
        { label: 'Router fee', value: formatPercent(signed.routerFeeBps / 100) },
        { label: 'Deadline', value: `${prepared.deadlineMinutes} min` },
        { label: 'Network', value: prepared.network.networkName },
      ],
      warning: warnings.length ? warnings.join(' ') : undefined,
      fee: feeSelection.selectorProps,
    };
  }, [feeSelection.fee, feeSelection.selectorProps, fiatOf, prepared, toView, tokens]);

  const sortedTokens = useMemo(() => sortSwapTokens(tokens, balances), [balances, tokens]);
  const popular = (swapConfig?.popularTokens ?? []).map(id => tokens.find(token => token.id === id)).filter((token): token is SwapToken => Boolean(token));
  const suggestions = [...popular, ...sortedTokens]
    .filter((token, index, list) => token.id !== inputId && list.findIndex(item => item.id === token.id) === index)
    .slice(0, SUGGESTION_COUNT);

  const error = tokensQuery.isError
    ? 'Couldn’t load the token list. Try again later.'
    : maxError ?? (prepare.error
      ? toErrorMessage(prepare.error)
      : quoteStatus === SwapQuoteStatus.ERROR ? toErrorMessage(quoteQuery.error) : undefined);
  const approximateNotice = maxApproximate && input && swapConfig
    ? `Couldn’t estimate the network fee, so ${toDisplayAmount(swapConfig.nativeFeeReserve, input.decimals)} ${input.symbol} is kept back. The amount is approximate.`
    : undefined;

  return (
    <SwapPage
      onClose={navigation.goBack}
      onOpenSettings={openSettings}
      unavailable={supported
        ? undefined
        : { title: 'Swap isn’t available here', description: `GnoSwap isn’t available on ${network.networkName}. Switch to a Gno.land network with GnoSwap to swap tokens.` }}
      sell={{
        token: input && toView(input),
        amount,
        fiatLabel: fiatOf(amountRaw, input),
        balanceLabel: input && inputBalance !== undefined ? formatTokenAmount(inputBalance, input.decimals, 6) : undefined,
        insufficient,
      }}
      buy={{
        token: output && toView(output),
        amount: quote && output ? formatSwapAmount(displayAmount(quote.amountOut, output.decimals)) : '',
        fiatLabel: quote ? fiatOf(quote.amountOut, output) : undefined,
        balanceLabel: output && balances?.[output.id] !== undefined ? formatTokenAmount(balances[output.id], output.decimals, 6) : undefined,
        loading: quoteStatus === SwapQuoteStatus.LOADING,
      }}
      suggestedTokens={suggestions.map(toView)}
      onSelectSellToken={() => setSheetSide('sell')}
      onSelectBuyToken={() => setSheetSide('buy')}
      onPickBuyToken={tokenId => selectToken('buy', tokenId)}
      onFlip={handleFlip}
      details={details}
      detailsExpanded={detailsExpanded}
      onToggleDetails={() => setDetailsExpanded(value => !value)}
      onPercent={handlePercent}
      percentLoading={maxPercent ?? undefined}
      onKeyPress={handleKeyPress}
      action={action}
      onAction={handleAction}
      error={error}
      notice={pendingBroadcast.notice ?? approximateNotice}
      tokenSheet={{
        visible: sheetSide !== null,
        title: sheetSide === 'buy' ? 'Select token to buy' : 'Select token to sell',
        query,
        onChangeQuery: setQuery,
        quickTokens: popular.map(toView),
        tokens: searchSwapTokens(sortedTokens, query).map(toView),
        loading: tokensQuery.isPending && supported,
        error: tokensQuery.isError ? 'Couldn’t load tokens.' : undefined,
        onSelect: tokenId => selectToken(sheetSide ?? 'sell', tokenId),
        onClose: () => {
          setSheetSide(null);
          setQuery('');
        },
      }}
      settingsSheet={{
        visible: settingsVisible,
        autoSlippage: draftAuto,
        autoSlippageLabel: formatPercent(AUTO_SLIPPAGE_PERCENT),
        slippageText,
        deadlineText,
        slippageError,
        slippageWarning,
        deadlineError,
        canSave: canSaveSettings,
        onSelectAuto: () => setDraftAuto(true),
        onSelectCustom: () => setDraftAuto(false),
        onChangeSlippage: setSlippageText,
        onChangeDeadline: setDeadlineText,
        onSave: saveSettings,
        onClose: () => setSettingsVisible(false),
      }}
      review={review}
      confirming={submit.isPending}
      reviewError={submit.error ? toErrorMessage(submit.error) : undefined}
      onConfirm={handleConfirm}
      onCloseReview={handleCloseReview}
    />
  );
};
