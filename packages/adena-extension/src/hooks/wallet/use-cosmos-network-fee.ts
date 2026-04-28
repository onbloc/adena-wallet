import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useQuery } from '@tanstack/react-query';
import { GasInfo, NetworkFee, NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import {
  CosmosDocument,
  FEE_PRESET_MULTIPLIERS,
  calcFee,
} from 'adena-module';
import BigNumber from 'bignumber.js';
import { useCallback, useMemo, useState } from 'react';

const GET_ESTIMATE_COSMOS_FEE = 'cosmosTx/estimateFee';
const REFETCH_INTERVAL = 5_000;

const PRESET_TO_MULTIPLIER: Record<NetworkFeeSettingType, number> = {
  [NetworkFeeSettingType.SLOW]: FEE_PRESET_MULTIPLIERS.SLOW,
  [NetworkFeeSettingType.AVERAGE]: FEE_PRESET_MULTIPLIERS.AVERAGE,
  [NetworkFeeSettingType.FAST]: FEE_PRESET_MULTIPLIERS.FAST,
};

const EMPTY_STORAGE_DEPOSITS = {
  storageDeposit: 0,
  unlockDeposit: 0,
  storageUsage: 0,
  releaseStorageUsage: 0,
};

export interface UseCosmosNetworkFeeReturn {
  isLoading: boolean;
  isFetchedPriceTiers: boolean;
  isSimulateError: boolean;
  networkFeeSettings: NetworkFeeSettingInfo[] | null;
  networkFeeSettingType: NetworkFeeSettingType;
  currentGasInfo: GasInfo | null;
  changedGasInfo: GasInfo | null;
  currentFeeAmount: string;
  currentFeeDenom: string | null;
  currentFeeGas: string;
  networkFee: NetworkFee | null;
  gasAdjustment: string;
  setGasAdjustment: (ratio: string) => void;
  setNetworkFeeSetting: (info: NetworkFeeSettingInfo) => void;
  save: () => void;
  simulateErrorMessage: string | null;
  // Display-unit overrides for NetworkFeeSetting / NetworkFeeSettingItem.
  feeSymbol: string | undefined;
  feeDecimals: number | undefined;
}

/**
 * Cosmos counterpart of `useNetworkFee`. Estimates gas via
 * `TransactionService.estimateCosmosFee`, then derives slow/average/fast
 * tiers locally from the shared `calcFee` utility. Shape mirrors
 * `useNetworkFee` so the existing `NetworkFeeSetting` component consumes
 * it with no changes.
 *
 * The feemarket base price is authoritative — there is no user-facing gas
 * adjustment on Cosmos, so `gasAdjustment` is fixed at "1.0" and its setter
 * is a no-op.
 */
export const useCosmosNetworkFee = (
  document: CosmosDocument | null | undefined,
): UseCosmosNetworkFeeReturn => {
  const { transactionService, chainRegistry, tokenRegistry } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();

  const [currentSettingType, setCurrentSettingType] = useState<NetworkFeeSettingType>(
    NetworkFeeSettingType.AVERAGE,
  );
  const [pendingSettingType, setPendingSettingType] = useState<NetworkFeeSettingType>(
    NetworkFeeSettingType.AVERAGE,
  );

  const chain = useMemo(() => {
    if (!document || !chainRegistry) {
      return null;
    }
    const maybeChain = chainRegistry.getChainByChainId(document.chainId);
    return maybeChain && maybeChain.chainType === 'cosmos' ? maybeChain : null;
  }, [document?.chainId, chainRegistry]);

  const fallbackFee = chain?.fee.fallbackFee ?? null;

  // Resolve the display profile (symbol + decimals) for the chain's default
  // fee token so the UI can render "PHOTON" rather than the on-chain
  // "uphoton" micro-denom.
  const feeTokenProfile = useMemo(() => {
    if (!chain || !tokenRegistry) return null;
    return tokenRegistry.get(chain.fee.defaultFeeTokenId) ?? null;
  }, [chain, tokenRegistry]);

  const { data, isFetched } = useQuery({
    queryKey: [
      GET_ESTIMATE_COSMOS_FEE,
      currentAccount?.id,
      document?.chainId,
      document?.msgs,
      document?.memo,
    ],
    queryFn: async () => {
      if (!transactionService || !currentAccount || !document) {
        return null;
      }
      try {
        const estimate = await transactionService.estimateCosmosFee(
          currentAccount.id,
          document,
        );
        return { estimate, errorMessage: null as string | null };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { estimate: null, errorMessage: message };
      }
    },
    enabled: !!transactionService && !!currentAccount && !!document,
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
  });

  const isLoading = !isFetched && data === undefined;
  const isSimulateError = !!data && data.estimate === null;
  const simulateErrorMessage = data?.errorMessage ?? null;

  const networkFeeSettings = useMemo<NetworkFeeSettingInfo[] | null>(() => {
    if (!data) {
      return null;
    }

    return (Object.values(NetworkFeeSettingType) as NetworkFeeSettingType[]).map(
      (settingType) => {
        const multiplier = PRESET_TO_MULTIPLIER[settingType];
        let feeAmount: string;
        let gasWanted: string;
        let hasError = false;

        if (data.estimate) {
          const fee = calcFee({
            gasUsed: data.estimate.gasUsed,
            gasMultiplier: multiplier,
            minBaseGasPrice: data.estimate.minBaseGasPrice,
            feeDenom: data.estimate.feeDenom,
          });
          feeAmount = fee.amount[0].amount;
          gasWanted = fee.gas;
        } else if (fallbackFee) {
          feeAmount = fallbackFee.amount[0].amount;
          gasWanted = fallbackFee.gas;
          hasError = true;
        } else {
          feeAmount = '0';
          gasWanted = '0';
          hasError = true;
        }

        const gasInfo: GasInfo = {
          gasFee: Number(feeAmount),
          gasUsed: Number(gasWanted),
          gasWanted: Number(gasWanted),
          gasPrice: Number(data.estimate?.minBaseGasPrice ?? 0),
          hasError,
          simulateErrorMessage: hasError ? simulateErrorMessage : null,
        };

        return {
          settingType,
          gasInfo,
          storageDeposits: EMPTY_STORAGE_DEPOSITS,
        };
      },
    );
  }, [data, fallbackFee, simulateErrorMessage]);

  const currentTier = useMemo(() => {
    if (!networkFeeSettings) return null;
    return (
      networkFeeSettings.find((t) => t.settingType === currentSettingType) ?? null
    );
  }, [networkFeeSettings, currentSettingType]);

  const pendingTier = useMemo(() => {
    if (!networkFeeSettings) return null;
    return (
      networkFeeSettings.find((t) => t.settingType === pendingSettingType) ?? null
    );
  }, [networkFeeSettings, pendingSettingType]);

  const currentGasInfo = currentTier?.gasInfo ?? null;
  const changedGasInfo = pendingTier?.gasInfo ?? null;
  const currentFeeAmount = currentGasInfo ? String(currentGasInfo.gasFee) : '0';
  const currentFeeGas = currentGasInfo ? String(currentGasInfo.gasWanted) : '0';
  const currentFeeDenom =
    data?.estimate?.feeDenom ?? fallbackFee?.amount[0]?.denom ?? null;

  const networkFee = useMemo<NetworkFee | null>(() => {
    if (!currentGasInfo || !currentFeeDenom) {
      return null;
    }
    // Convert raw u-unit amount to display units using the token profile
    // (e.g. 20_568 uphoton → "0.020568" PHOTON). Fall back to the raw
    // denom when the token is not in the registry.
    const decimals = feeTokenProfile?.decimals ?? 0;
    const symbol = feeTokenProfile?.symbol ?? currentFeeDenom;
    const displayAmount = BigNumber(currentGasInfo.gasFee)
      .shiftedBy(-decimals)
      .toFixed();
    return { amount: displayAmount, denom: symbol };
  }, [currentGasInfo, currentFeeDenom, feeTokenProfile]);

  const setNetworkFeeSetting = useCallback((info: NetworkFeeSettingInfo) => {
    setPendingSettingType(info.settingType);
  }, []);

  const save = useCallback(() => {
    setCurrentSettingType(pendingSettingType);
  }, [pendingSettingType]);

  // No user-facing gas adjustment on Cosmos — kept for prop-shape parity with
  // `useNetworkFee` so the existing NetworkFeeSetting component drops in.
  const setGasAdjustment = useCallback(() => {
    /* no-op */
  }, []);

  return {
    isLoading,
    isFetchedPriceTiers: !isLoading,
    isSimulateError,
    networkFeeSettings,
    networkFeeSettingType: pendingSettingType,
    currentGasInfo,
    changedGasInfo,
    currentFeeAmount,
    currentFeeDenom,
    currentFeeGas,
    networkFee,
    gasAdjustment: '1.0',
    setGasAdjustment,
    setNetworkFeeSetting,
    save,
    simulateErrorMessage,
    feeSymbol: feeTokenProfile?.symbol,
    feeDecimals: feeTokenProfile?.decimals,
  };
};
