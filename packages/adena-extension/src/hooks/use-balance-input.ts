import { useQuery, useQueryClient } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { GAS_FEE_SAFETY_MARGIN } from '@common/constants/gas.constant';
import { GasToken, GNOT_TOKEN } from '@common/constants/token.constant';
import { DEFAULT_GAS_FEE, DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { shouldMarkSessionRevoked } from '@common/utils/session-chain-visibility';
import { getTransferLimitAmount } from '@common/utils/transfer-limit';
import { isNativeTokenModel } from '@common/validation/validation-token';
import { MsgEndpoint } from '@gnolang/gno-js-client';
import type { SessionMetadataV021 } from '@migrates/migrations/v021/storage-model-v021';
import { parseCoins } from '@services/transaction/session-spend';
import { GasInfo, TokenBalanceType, TokenModel } from '@types';
import { Document, isSessionAccount } from 'adena-module';
import { useAdenaContext, useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { useNetwork } from './use-network';
import { SESSIONS_QUERY_KEY } from './use-sessions';
import { useTokenBalance } from './use-token-balance';
import { getCosmosOriginDenom, useTokenMetainfo } from './use-token-metainfo';
import { useNetworkFee } from './wallet/use-network-fee';
import { useVestingLocked } from './wallet/use-vesting-locked';

// Buffer applied to the simulated cosmos fee when computing the Max amount.
// Absorbs feemarket base-price drift between Max click and broadcast, plus
// minor simulation variance from amount-string length changes after Max fills.
const COSMOS_MAX_FEE_SAFETY_MARGIN = 1.1;

export type UseBalanceInputHookReturn = {
  hasError: boolean;
  amount: string;
  denom: string;
  description: string;
  gasInfo: GasInfo | null;
  setAmount: (amount: string) => void;
  updateCurrentBalance: () => Promise<boolean>;
  onChangeAmount: (amount: string) => void;
  onClickMax: () => void;
  validateBalanceInput: () => boolean;
};

export type CosmosFeeContext = {
  currentFeeAmount: string;
  currentFeeDenom: string | null;
  feeDecimals: number | undefined;
  isLoading: boolean;
  isSimulateError: boolean;
};

type SessionSpendConfig = {
  spendLimit?: string;
  spendUsed?: string;
};

export const useBalanceInput = (
  tokenMetainfo?: TokenModel,
  cosmosFeeContext?: CosmosFeeContext,
  toAddress?: string,
): UseBalanceInputHookReturn => {
  const { balanceService, tokenRegistry, sessionRepository } = useAdenaContext();
  const { wallet, gnoProvider } = useWalletContext();
  const { currentAccount, currentFundingAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const queryClient = useQueryClient();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [currentBalance, setCurrentBalance] = useState<TokenBalanceType>();
  const [availAmountNumber, setAvailAmountNumber] = useState<BigNumber>(BigNumber(0));
  const { fetchBalanceBy } = useTokenBalance();
  const { convertDenom } = useTokenMetainfo();

  const [document, setDocument] = useState<Document | null>(null);
  const { currentGasInfo } = useNetworkFee(document);

  const isGnoNativeTransfer = !!tokenMetainfo && isNativeTokenModel(tokenMetainfo);

  const isSessionNativeTransfer =
    currentAccount !== null && isSessionAccount(currentAccount) && isGnoNativeTransfer;

  // Only the native token is ever vesting-locked, and the lock belongs to the
  // address that pays — the master address for a session account.
  const { lockedAmount: vestingLockedAmount, isLoading: isLoadingVestingLocked } = useVestingLocked(
    currentFundingAddress,
    isGnoNativeTransfer,
  );

  const { data: currentSessionMetadata = null, isLoading: isLoadingCurrentSessionMetadata } =
    useQuery<SessionMetadataV021 | null>(
      ['sessionMetadataForBalanceInput', currentAccount?.id, currentNetwork.chainId],
      async () => {
        if (!currentAccount || !isSessionAccount(currentAccount)) {
          return null;
        }

        const sessionAddr = await currentAccount.getAddress('g').catch(() => null);
        if (!sessionAddr) {
          return null;
        }

        const stored = await sessionRepository.get(sessionAddr);
        if (!gnoProvider) {
          return stored;
        }

        let record;
        try {
          record = await gnoProvider.getSession(currentAccount.getMasterAddress(), sessionAddr);
        } catch {
          return stored;
        }
        if (!record) {
          const revoked = await shouldMarkSessionRevoked(
            stored,
            async () =>
              !!(await gnoProvider.getSession(currentAccount.getMasterAddress(), sessionAddr)),
          );
          if (revoked && stored) {
            await sessionRepository.setStatus(sessionAddr, 'REVOKED').catch(() => undefined);
            // Without this the dim, the popover and the balance address only catch
            // up on the next SESSIONS refetch.
            await queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] });
            return { ...stored, status: 'REVOKED' };
          }
          return stored;
        }

        const base = record.BaseSessionAccount;
        const nowSeconds = Math.floor(Date.now() / 1000);
        const expiresAt = Number(base.expires_at ?? stored?.expiresAt ?? 0);
        const status: SessionMetadataV021['status'] =
          stored?.status === 'REVOKED'
            ? 'REVOKED'
            : expiresAt > 0 && nowSeconds >= expiresAt
              ? 'EXPIRED'
              : 'ACTIVE';
        const spendUsed = base.spend_used === '' ? undefined : base.spend_used;
        const spendReset =
          base.spend_reset != null && base.spend_reset !== ''
            ? Number(base.spend_reset)
            : undefined;

        if (stored) {
          await sessionRepository
            .syncFromChain(sessionAddr, { spendUsed, spendReset, status })
            .catch(() => undefined);
        }

        return {
          masterAddress: stored?.masterAddress ?? currentAccount.getMasterAddress(),
          chainId: stored?.chainId ?? currentAccount.sessionConfig.chainId,
          allowPaths: stored?.allowPaths ?? currentAccount.sessionConfig.allowPaths ?? [],
          spendLimit:
            base.spend_limit ?? stored?.spendLimit ?? currentAccount.sessionConfig.spendLimit ?? '',
          spendPeriod: Number(
            base.spend_period ??
              stored?.spendPeriod ??
              currentAccount.sessionConfig.spendPeriod ??
              0,
          ),
          spendUsed,
          spendReset,
          expiresAt,
          status,
          createdAt: stored?.createdAt ?? nowSeconds,
          txHash: stored?.txHash,
        };
      },
      {
        enabled: currentAccount !== null && isSessionAccount(currentAccount),
        refetchInterval: 30_000,
      },
    );

  const sessionSpendConfig = useMemo<SessionSpendConfig | null>(() => {
    if (!currentAccount || !isSessionAccount(currentAccount)) {
      return null;
    }

    return {
      spendLimit: currentSessionMetadata?.spendLimit ?? currentAccount.sessionConfig.spendLimit,
      spendUsed: currentSessionMetadata?.spendUsed,
    };
  }, [currentAccount, currentSessionMetadata]);

  const sessionSpendableAmount = useMemo(() => {
    if (!isSessionNativeTransfer) {
      return null;
    }

    if (isLoadingCurrentSessionMetadata) {
      return BigNumber(0);
    }

    return getSessionSpendableAmount(sessionSpendConfig, tokenMetainfo);
  }, [isLoadingCurrentSessionMetadata, isSessionNativeTransfer, sessionSpendConfig, tokenMetainfo]);

  useEffect(() => {
    if (!currentFundingAddress || !currentBalance || !tokenMetainfo) {
      return;
    }

    const amount = BigNumber(currentBalance.amount.value)
      .multipliedBy(0.9)
      .toFixed(tokenMetainfo.decimals || 6);

    setDocument(
      makeTransferDocument({
        chainId: currentNetwork.networkId,
        // Max-amount simulate document must use the funding (master) address so
        // that gas estimation reflects the account that will actually pay.
        fromAddress: currentFundingAddress,
        // Estimate against the real recipient when known: sending to a
        // not-yet-initialized account costs extra gas (account creation), so a
        // self-send proxy underestimates the fee. For a session transfer that
        // gap can push MAX (limit − used − fee) over the on-chain spend limit,
        // which counts fee + amount, and the broadcast is rejected. Mirrors the
        // cosmos estimate document. Falls back to a self-send before a recipient
        // is entered, which is enough for the initial fee preview.
        toAddress: toAddress || currentFundingAddress,
        amount: amount,
        memo: '',
      }),
    );
  }, [currentNetwork, currentFundingAddress, toAddress, currentBalance, tokenMetainfo]);

  useEffect(() => {
    if (!currentBalance) {
      return;
    }

    if (isNativeTokenModel(currentBalance)) {
      if (!currentGasInfo) {
        return;
      }
      const convertedBalance = convertDenom(
        currentBalance.amount.value,
        currentBalance.amount.denom,
        'COMMON',
      );
      const balanceAmountNumber = BigNumber(convertedBalance.value);

      const maxGasFeeBN = BigNumber(currentGasInfo.gasWanted)
        .multipliedBy(currentGasInfo.gasPrice * GAS_FEE_SAFETY_MARGIN)
        .shiftedBy(GasToken.decimals * -1)
        .toFixed(GasToken.decimals, BigNumber.ROUND_UP);

      setAvailAmountNumber(
        getTransferLimitAmount({
          balance: balanceAmountNumber,
          sessionSpendable: sessionSpendableAmount,
          vestingLocked: vestingLockedAmount,
          feeAmount: BigNumber(maxGasFeeBN),
        }),
      );
      return;
    }

    // cosmos-native: balance.amount.value is already display-unit
    // (CosmosBalanceService.getTokenBalance shifts by -decimals).
    const balanceDisplay = BigNumber(currentBalance.amount.value);
    // Prefer the metainfo denom; fall back to tokenRegistry for accounts
    // whose stored entries predate the denom-seed fix.
    let transferDenom: string | null =
      (tokenMetainfo as { denom?: string } | undefined)?.denom ?? null;
    if (!transferDenom && tokenMetainfo) {
      const profile = tokenRegistry.get(tokenMetainfo.tokenId);
      transferDenom = profile ? getCosmosOriginDenom(profile) || null : null;
    }
    const feeDenom = cosmosFeeContext?.currentFeeDenom ?? null;
    const rawFee = cosmosFeeContext?.currentFeeAmount ?? null;
    const feeDecimals = cosmosFeeContext?.feeDecimals ?? tokenMetainfo?.decimals ?? 6;

    if (transferDenom && feeDenom && transferDenom === feeDenom && rawFee && Number(rawFee) > 0) {
      const feeDisplay = BigNumber(rawFee)
        .multipliedBy(COSMOS_MAX_FEE_SAFETY_MARGIN)
        .shiftedBy(-feeDecimals);
      const avail = balanceDisplay.minus(feeDisplay);
      setAvailAmountNumber(avail.isGreaterThan(0) ? avail : BigNumber(0));
      return;
    }

    setAvailAmountNumber(balanceDisplay.isGreaterThan(0) ? balanceDisplay : BigNumber(0));
  }, [
    currentGasInfo,
    currentBalance,
    tokenMetainfo,
    tokenRegistry,
    sessionSpendableAmount,
    vestingLockedAmount,
    cosmosFeeContext?.currentFeeAmount,
    cosmosFeeContext?.currentFeeDenom,
    cosmosFeeContext?.feeDecimals,
  ]);

  const updateCurrentBalance = useCallback(async () => {
    if (!currentFundingAddress) {
      return false;
    }

    if (!tokenMetainfo) {
      return false;
    }

    // getGnotTokenBalance now rejects on a transport failure, so leave the
    // balance undefined rather than letting the rejection break the screen.
    const currentBalance = await fetchBalanceBy(currentFundingAddress, tokenMetainfo).catch(
      () => undefined,
    );
    setCurrentBalance(currentBalance);
    return true;
  }, [wallet, balanceService, currentFundingAddress, tokenMetainfo]);

  const clearError = useCallback(() => {
    setHasError(false);
    setErrorMessage('Invalid address');
  }, []);

  const getDescription = useCallback(() => {
    if (hasError || !tokenMetainfo) {
      return errorMessage;
    }
    // A grant makes part of the balance untransferable, so the figure stops
    // being the account's balance and reads as spendable, like a session's.
    const isCappedTransfer = isSessionNativeTransfer || vestingLockedAmount !== null;
    const label = isCappedTransfer ? 'Spendable' : 'Balance';

    // A balance that could not be read is not a zero balance.
    if (!currentBalance) {
      return `${label}: - ${tokenMetainfo.symbol}`;
    }

    // A capped transfer shows the figure the field will actually accept — fee
    // reserved and all. Anything else would advertise an amount that validation
    // rejects on the next keystroke, since a capped send is checked against
    // that same limit rather than the lenient balance.
    const balanceAmount = BigNumber(currentBalance.amount.value || 0);
    const descriptionAmount = isCappedTransfer
      ? availAmountNumber
      : getLimitedAmount(balanceAmount, sessionSpendableAmount);
    return `${label}: ${descriptionAmount.toFormat()} ${tokenMetainfo.symbol}`;
  }, [
    availAmountNumber,
    currentBalance,
    errorMessage,
    hasError,
    isSessionNativeTransfer,
    sessionSpendableAmount,
    vestingLockedAmount,
    tokenMetainfo,
  ]);

  const onChangeAmount = useCallback((amount: string) => {
    const charAtFirst = amount.charAt(0);
    const charAtSecond = amount.charAt(1);
    let charAtZeroCheck: string | null = amount;
    if (Number(charAtSecond) >= 1 && charAtFirst === '0') {
      charAtZeroCheck = amount.replace(/(^0+)/, '');
    } else if (Number(charAtSecond) === 0 && charAtFirst === '0') {
      charAtZeroCheck = amount.replace(/(^0+)/, '0');
    } else if (charAtFirst === '.') {
      charAtZeroCheck = `0${amount}`;
    }
    if (charAtZeroCheck.includes('.') && charAtZeroCheck.split('.')[1].length > 6) {
      setAmount(
        Number(charAtZeroCheck)
          .toFixed(tokenMetainfo?.decimals || 6)
          .toString(),
      );
    } else {
      setAmount(charAtZeroCheck);
    }
    clearError();
  }, []);

  const onClickMax = useCallback(() => {
    // gno: requires gas info to compute the fee-adjusted max, so bail until ready.
    // cosmos: useEffect falls back to the full display balance when the fee
    // estimate isn't ready, so committing availAmountNumber is safe. The
    // summary screen's transfer + fee check is the authoritative gate.
    if (!cosmosFeeContext && !currentGasInfo) {
      return;
    }
    // An unread grant looks exactly like no grant, and filling the full
    // balance would put locked coins in the field.
    if (isLoadingVestingLocked) {
      return;
    }
    setAmount(availAmountNumber.toString());
  }, [availAmountNumber, currentGasInfo, cosmosFeeContext, isLoadingVestingLocked]);

  const validateBalanceInput = useCallback(() => {
    const balanceAmount = BigNumber(currentBalance?.amount.value || 0);
    const limitedBalanceAmount = getLimitedAmount(balanceAmount, sessionSpendableAmount);

    // A vesting send is checked against the fee-adjusted cap rather than the
    // lenient balance the other paths use: the summary screen only weighs the
    // transfer against the balance, so nothing downstream would catch an
    // amount that clears the balance but not the lock. An unread grant admits
    // nothing — treating it as "not locked" is exactly the gap that would let
    // a typed amount through while MAX is still held back.
    const isCappedTransfer = isSessionNativeTransfer || vestingLockedAmount !== null;
    const maxInputAmount = isLoadingVestingLocked
      ? BigNumber(0)
      : isCappedTransfer
        ? currentGasInfo
          ? availAmountNumber
          : BigNumber(0)
        : limitedBalanceAmount;

    if (
      BigNumber(amount || 0).isGreaterThan(maxInputAmount) ||
      BigNumber(amount || 0).isLessThanOrEqualTo(0)
    ) {
      setHasError(true);
      setErrorMessage('Insufficient balance');
      return false;
    }
    clearError();
    return true;
  }, [
    amount,
    availAmountNumber,
    currentBalance,
    currentGasInfo,
    isSessionNativeTransfer,
    isLoadingVestingLocked,
    sessionSpendableAmount,
    vestingLockedAmount,
  ]);

  return {
    hasError,
    amount,
    denom: tokenMetainfo?.symbol || '',
    description: getDescription(),
    gasInfo: currentGasInfo,
    setAmount,
    updateCurrentBalance,
    onChangeAmount,
    onClickMax,
    validateBalanceInput,
  };
};

function makeTransferDocument(params: {
  chainId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  memo: string;
}): Document {
  return {
    account_number: '0',
    sequence: '0',
    chain_id: params.chainId,
    msgs: [
      {
        type: MsgEndpoint.MSG_SEND,
        value: {
          from_address: params.fromAddress,
          to_address: params.toAddress,
          amount: `1${GNOT_TOKEN.denom}`,
        },
      },
    ],
    memo: params.memo,
    fee: {
      amount: [
        {
          denom: GasToken.denom,
          amount: DEFAULT_GAS_FEE.toString(),
        },
      ],
      gas: DEFAULT_GAS_WANTED.toString(),
    },
  };
}

function getSessionSpendableAmount(
  sessionSpendConfig: SessionSpendConfig | null,
  tokenMetainfo?: TokenModel,
): BigNumber | null {
  if (!sessionSpendConfig?.spendLimit || !tokenMetainfo || tokenMetainfo.type !== 'gno-native') {
    return null;
  }

  try {
    const denom = getNativeTokenMinimalDenom(tokenMetainfo);
    const spendLimitAmount = getCoinAmount(parseCoins(sessionSpendConfig.spendLimit), denom);
    const spendUsedAmount = getCoinAmount(parseCoins(sessionSpendConfig.spendUsed ?? ''), denom);
    const remainingAmount =
      spendLimitAmount > spendUsedAmount ? spendLimitAmount - spendUsedAmount : BigInt(0);
    const decimals = tokenMetainfo.decimals ?? GNOT_TOKEN.decimals;
    return BigNumber(remainingAmount.toString()).shiftedBy(-decimals);
  } catch {
    return BigNumber(0);
  }
}

function getNativeTokenMinimalDenom(tokenMetainfo: TokenModel): string {
  return (tokenMetainfo as { denom?: string }).denom ?? GNOT_TOKEN.denom;
}

function getCoinAmount(coins: ReturnType<typeof parseCoins>, denom: string): bigint {
  return coins.find((coin) => coin.denom === denom)?.amount ?? BigInt(0);
}

function getLimitedAmount(amount: BigNumber, limit: BigNumber | null): BigNumber {
  if (limit === null) {
    return amount;
  }
  return amount.isLessThan(limit) ? amount : limit;
}
