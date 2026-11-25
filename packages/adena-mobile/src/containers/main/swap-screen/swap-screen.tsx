import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  MAX_INT64,
  routerFeeOf,
  slippageToBps,
  swapLimits,
  SwapSettings,
  SwapToken,
  SwapType,
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
import { PreparedSwap, SWAP_QUOTE_TTL_MS, SwapMaxResult } from '../../../services/swap.service';
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

// Comma-decimal locales type "0,5" on the decimal pad.
const parseSlippageText = (text: string): number | null => {
  const normalized = text.trim().replace(',', '.');

  return /^\d{1,2}(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : null;
};

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
  // The typed amount belongs to `exactSide`: sell = EXACT_IN, buy = EXACT_OUT (Uniswap's independent field).
  const [amount, setAmount] = useState('');
  const [exactSide, setExactSide] = useState<Side>('sell');
  const [sheetSide, setSheetSide] = useState<Side | null>(null);
  const [query, setQuery] = useState('');
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [draftAuto, setDraftAuto] = useState(true);
  const [slippageText, setSlippageText] = useState('');
  const [deadlineText, setDeadlineText] = useState('');
  // replacesPending: reviewed while a previous unconfirmed tx could be replaced; sent pinned to its sequence.
  const [prepared, setPrepared] = useState<(PreparedSwap & { replacesPending?: boolean }) | null>(null);
  // Native max per input/output/balance; an edit bumps the epoch so a late estimate is dropped.
  const [maxCache, setMaxCache] = useState<{ key: string; result: SwapMaxResult } | null>(null);
  const [maxPercent, setMaxPercent] = useState<SwapPercent | null>(null);
  const [maxError, setMaxError] = useState<string>();
  const [maxApproximate, setMaxApproximate] = useState(false);
  const maxEpochRef = useRef(0);
  const sendingRef = useRef(false);
  const feeSelection = useFeeSelection(prepared?.estimate ?? null, prepared?.network ?? network);

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
  const exactType = exactSide === 'sell' ? SwapType.EXACT_IN : SwapType.EXACT_OUT;
  const exactToken = exactSide === 'sell' ? input : output;
  const amountRaw = useMemo(() => (exactToken && isPositiveAmount(amount) ? toBaseUnit(amount, exactToken.decimals) : '0'), [amount, exactToken]);
  const debouncedRaw = useDebouncedValue(amountRaw, QUOTE_DEBOUNCE_MS);
  const inputBalance = input ? balances?.[input.id] : undefined;
  const hasAmount = amountRaw !== '0';
  const tooLarge = BigInt(amountRaw) > MAX_INT64;
  const minDeposit = swapConfig?.wrappedNative.minDeposit;
  const sameToken = Boolean(input && output && input.swapPath === output.swapPath);
  const quoteEnabled = supported && Boolean(input && output) && !sameToken && debouncedRaw !== '0' && debouncedRaw === amountRaw && !tooLarge
    && !(exactType === SwapType.EXACT_IN && input?.isNative && minDeposit && compareAmount(amountRaw, minDeposit) < 0);

  const quoteKey = queryKeys.swapQuote(network.id, input?.id ?? NO_ID_KEY, output?.id ?? NO_ID_KEY, `${exactType}:${debouncedRaw}`);
  const quoteQuery = useQuery({
    queryKey: quoteKey,
    queryFn: () => swapService.getQuote({ network, input: input!, output: output!, exactType, amount: debouncedRaw }),
    enabled: quoteEnabled && !prepared,
    staleTime: QUOTE_STALE_MS,
    refetchInterval: prepared ? false : QUOTE_REFRESH_MS,
    retry: false,
  });
  // A quote for another amount, side or pair is never shown or used.
  const currentQuote = quoteQuery.data && quoteQuery.data.exactType === exactType && quoteQuery.data.requestedAmount === amountRaw
    && quoteQuery.data.inputTokenId === input?.id && quoteQuery.data.outputTokenId === output?.id
    ? quoteQuery.data
    : undefined;
  const [expiredQuotedAt, setExpiredQuotedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!currentQuote) {
      return undefined;
    }

    const timer = setTimeout(() => setExpiredQuotedAt(currentQuote.quotedAt), Math.max(0, currentQuote.quotedAt + SWAP_QUOTE_TTL_MS - Date.now()));

    return (): void => clearTimeout(timer);
  }, [currentQuote]);

  const quoteExpired = currentQuote !== undefined && expiredQuotedAt === currentQuote.quotedAt;
  // Neither is a failed refetch's leftover nor an expired quote offered for review.
  const quote = currentQuote && !quoteQuery.isError && !quoteExpired ? currentQuote : undefined;
  const slippageBps = slippageToBps(effectiveSlippage(settings));
  const limits = quote ? swapLimits(quote, slippageBps) : undefined;
  // What may leave the wallet: the typed input, or EXACT_OUT's amountInMax once quoted.
  const spendRaw = exactType === SwapType.EXACT_IN ? (hasAmount ? amountRaw : undefined) : limits?.maxAmountIn;
  const insufficient = inputBalance !== undefined && spendRaw !== undefined && compareAmount(spendRaw, inputBalance) > 0;
  const belowMinimum = Boolean(input?.isNative && spendRaw && minDeposit && compareAmount(spendRaw, minDeposit) < 0);
  const quoteStatus = ((): SwapQuoteStatus => {
    if (quote) {
      return SwapQuoteStatus.READY;
    }

    if ((quoteQuery.isError || quoteExpired) && quoteEnabled && !quoteQuery.isFetching) {
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

  const announceConfirmed = useCallback((): void => {
    queryClient.invalidateQueries({ queryKey: queryKeys.balances() });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'activities'] });
    playHaptic(HapticKind.SUCCESS);
    showToast('Swap confirmed', 'success');
  }, [playHaptic, queryClient, showToast]);

  // An earlier swap confirmed later: keep what is being typed; a replacement review mid-confirm stays so its error shows.
  const handlePolledCommit = useCallback((): void => {
    announceConfirmed();

    if (!sendingRef.current) {
      setPrepared(current => (current?.replacesPending ? null : current));
    }
  }, [announceConfirmed]);

  const pendingBroadcast = usePendingBroadcast(account ?? null, network, handlePolledCommit);

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

      return swapService.submit(
        prepared,
        { gasWanted: feeSelection.fee.gasWanted, gasFee: feeSelection.fee.gasFee },
        { replacePending: prepared.replacesPending },
      );
    },
  });

  const action = swapActionState({
    supported,
    input,
    output,
    hasAmount,
    tooLarge,
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
    if (!exactToken) {
      return;
    }

    resetQuoteState();
    setAmount(current => applyKeypadKey(current, key, exactToken.decimals));
  };

  // Focusing the other card makes it the exact side, keeping its shown estimate as the typed value.
  const focusSide = (side: Side): void => {
    if (side === exactSide) {
      return;
    }

    const token = side === 'sell' ? input : output;

    if (!token) {
      setSheetSide(side);
      return;
    }

    resetQuoteState();
    playHaptic(HapticKind.SELECTION);
    const estimate = quote ? (side === 'sell' ? quote.amountIn : quote.amountOut) : undefined;

    setAmount(estimate ? toDisplayAmount(estimate, token.decimals) : '');
    setExactSide(side);
  };

  const handlePercent = (percent: SwapPercent): void => {
    if (!input || inputBalance === undefined) {
      return;
    }

    resetQuoteState();

    const apply = (result?: SwapMaxResult): void => {
      const raw = percentOfBalance(inputBalance, percent, result?.amount);

      setMaxApproximate(Boolean(result?.approximate) && raw === result?.amount);
      setExactSide('sell');
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
    // Like Uniswap, the typed amount stays with its token, so the exact side flips with it.
    setExactSide(side => (side === 'sell' ? 'buy' : 'sell'));
    setInputId(outputId);
    setOutputId(inputId);
  };

  const selectToken = (side: Side, tokenId: string): void => {
    resetQuoteState();

    const otherId = side === 'sell' ? outputId : inputId;
    const currentId = side === 'sell' ? inputId : outputId;

    if (tokenId === otherId) {
      // Picking the other side's token swaps the pair, like the flip button.
      setExactSide(current => (current === 'sell' ? 'buy' : 'sell'));
      setInputId(outputId);
      setOutputId(inputId);
    }
    else {
      // A new token on the typed side invalidates the typed amount's decimals.
      if (tokenId !== currentId && side === exactSide) {
        setAmount('');
      }

      (side === 'sell' ? setInputId : setOutputId)(tokenId);
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
        setPrepared({ ...result, replacesPending: pendingBroadcast.replacesPending });
      },
      onError: (error) => {
        // An expired or moved quote is fetched again; its error must not outlive the new quote.
        if (isAppError(error, AppErrorCode.SWAP_PRICE_MOVED)) {
          prepare.reset();
          showToast(toErrorMessage(error), 'info');
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

    const { account: sender, network: sentNetwork } = prepared;

    sendingRef.current = true;
    submit.mutateAsync()
      .then((result) => {
        if (result.committed) {
          announceConfirmed();
          resetQuoteState();
          submit.reset();
          setPrepared(null);
          setAmount('');
          setExactSide('sell');
          return;
        }

        // Only accepted into the mempool: wait for it like an unknown outcome, as the send flow does.
        pendingBroadcast.trackSubmitted(result, sender, sentNetwork);
        submit.reset();
        setPrepared(null);
      }, (error) => {
        // Unknown outcome: close the review so the same swap cannot be confirmed again.
        if (pendingBroadcast.track(error, sender, sentNetwork)) {
          submit.reset();
          setPrepared(null);
        }
        // Moved or expired: drop the stale quote and close the review so a fresh quote is fetched.
        else if (isAppError(error, AppErrorCode.SWAP_PRICE_MOVED)) {
          submit.reset();
          setPrepared(null);
          showToast(toErrorMessage(error), 'info');
          void queryClient.resetQueries({ queryKey: quoteKey, exact: true });
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
      return 'High slippage: your swap may be front-run and fill at a worse price.';
    }

    return parsedSlippage < 0.05 ? 'Very low slippage: the swap may fail.' : undefined;
  })();
  const deadlineError = deadlineText.length > 0 && !isValidDeadline(parsedDeadline) ? 'Enter 1 to 180 minutes.' : undefined;
  const draftSlippage = draftAuto ? null : parsedSlippage;
  const settingsChanged = draftSlippage !== settings.slippage || parsedDeadline !== settings.deadlineMinutes;
  const canSaveSettings = settingsChanged && isValidDeadline(parsedDeadline) && (draftAuto || isValidSlippage(parsedSlippage));

  const saveSettings = (): void => {
    if (!canSaveSettings) {
      return;
    }

    resetQuoteState();
    preferenceService.update({ swapSlippage: draftSlippage, swapDeadlineMinutes: parsedDeadline as number });
    playHaptic(HapticKind.SUCCESS);
    setSettingsVisible(false);
  };

  const slippagePercent = effectiveSlippage(settings);
  const slippageLabel = settings.slippage === null ? `Auto ${formatPercent(AUTO_SLIPPAGE_PERCENT)}` : formatPercent(slippagePercent);
  const details: SwapDetailsView | undefined = quote && input && output && limits
    ? {
        rateLabel: formatSwapRate(quote, input, output),
        priceImpactLabel: formatPriceImpact(quote.priceImpactPercent),
        priceImpactHigh: isHighPriceImpact(quote.priceImpactPercent),
        slippageLabel,
        limit: quote.exactType === SwapType.EXACT_OUT
          ? { label: 'Max. sent', value: `${formatSwapAmount(displayAmount(limits.maxAmountIn, input.decimals))} ${input.symbol}` }
          : { label: 'Min. received', value: `${formatSwapAmount(displayAmount(limits.minAmountOut, output.decimals))} ${output.symbol}` },
        routerFeeLabel: `${formatPercent(quote.routerFeeBps / 100)} · ${formatSwapAmount(displayAmount(routerFeeOf(quote.amountOut, quote.routerFeeBps), output.decimals))} ${output.symbol}`,
        routes: buildRouteViews(quote, tokens),
      }
    : undefined;

  const review: SwapReviewView | undefined = useMemo(() => {
    if (!prepared || !feeSelection.fee) {
      return undefined;
    }

    const { input: paid, output: received, quote: signed } = prepared;
    const exactOut = signed.exactType === SwapType.EXACT_OUT;
    const outLabel = `${formatSwapAmount(displayAmount(signed.amountOut, received.decimals))} ${received.symbol}`;
    const minLabel = `${formatSwapAmount(displayAmount(prepared.minAmountOut, received.decimals))} ${received.symbol}`;
    const maxLabel = `${formatTokenAmount(prepared.maxAmountIn, paid.decimals)} ${paid.symbol}`;
    const routeLabel = buildRouteViews(signed, tokens)
      .map(view => `${view.share} ${view.steps.map(step => (step.fee ? `› ${step.symbol} (${step.fee})` : step.symbol)).join(' ')}`)
      .join('\n');
    const warnings = [
      isHighPriceImpact(signed.priceImpactPercent) ? `High price impact (${formatPriceImpact(signed.priceImpactPercent)}).` : undefined,
      exactOut && paid.isNative ? `${maxLabel} is wrapped for the swap; what it doesn’t use stays in your wallet as wugnot.` : undefined,
      received.isNative ? `At least ${minLabel} arrives as ${received.symbol}; anything above it stays wrapped as wugnot.` : undefined,
    ].filter(Boolean);

    return {
      pay: exactOut
        ? { caption: 'You pay (max)', token: toView(paid), amountLabel: maxLabel, fiatLabel: fiatOf(prepared.maxAmountIn, paid) }
        : { caption: 'You pay', token: toView(paid), amountLabel: `${formatTokenAmount(signed.amountIn, paid.decimals)} ${paid.symbol}`, fiatLabel: fiatOf(signed.amountIn, paid) },
      receive: { caption: exactOut ? 'You receive (exact)' : 'You receive (estimated)', token: toView(received), amountLabel: outLabel, fiatLabel: fiatOf(signed.amountOut, received) },
      rows: [
        exactOut ? { label: 'Max. sent', value: maxLabel, emphasis: true } : { label: 'Min. received', value: minLabel, emphasis: true },
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
      : quoteStatus === SwapQuoteStatus.ERROR ? (quoteQuery.isError ? toErrorMessage(quoteQuery.error) : 'The quote expired. Fetch a new one.') : undefined);
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
        amount: exactSide === 'sell' ? amount : quote && input ? formatSwapAmount(displayAmount(quote.amountIn, input.decimals)) : '',
        fiatLabel: fiatOf(exactSide === 'sell' ? amountRaw : quote?.amountIn ?? '0', input),
        balanceLabel: input && inputBalance !== undefined ? formatTokenAmount(inputBalance, input.decimals, 6) : undefined,
        insufficient,
        focused: exactSide === 'sell',
        loading: exactSide === 'buy' && quoteStatus === SwapQuoteStatus.LOADING,
      }}
      buy={{
        token: output && toView(output),
        amount: exactSide === 'buy' ? amount : quote && output ? formatSwapAmount(displayAmount(quote.amountOut, output.decimals)) : '',
        fiatLabel: fiatOf(exactSide === 'buy' ? amountRaw : quote?.amountOut ?? '0', output),
        balanceLabel: output && balances?.[output.id] !== undefined ? formatTokenAmount(balances[output.id], output.decimals, 6) : undefined,
        focused: exactSide === 'buy',
        loading: exactSide === 'sell' && quoteStatus === SwapQuoteStatus.LOADING,
      }}
      onFocusSell={() => focusSide('sell')}
      onFocusBuy={() => focusSide('buy')}
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
        slippageValueLabel: `${(draftAuto ? AUTO_SLIPPAGE_PERCENT : parsedSlippage ?? 0).toFixed(2)}%`,
        deadlineValueLabel: isValidDeadline(parsedDeadline) ? `${parsedDeadline} ${parsedDeadline === 1 ? 'minute' : 'minutes'}` : '—',
        slippageText,
        deadlineText,
        slippageError,
        slippageWarning,
        deadlineError,
        slippageValid: draftAuto || isValidSlippage(parsedSlippage),
        deadlineValid: isValidDeadline(parsedDeadline),
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
