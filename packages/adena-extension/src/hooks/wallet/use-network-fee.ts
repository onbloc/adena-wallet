import { DEFAULT_GAS_ADJUSTMENT, DEFAULT_GAS_PRICE_RATE } from '@common/constants/gas.constant';
import { GasToken } from '@common/constants/token.constant';
import { DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { convertRawGasAmountToDisplayAmount } from '@common/utils/gas-utils';
import { GasInfo, NetworkFee, NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import { Document } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useCallback, useMemo, useState } from 'react';
import {
  isStaticSessionAdminFeeDocument,
  makeStaticSessionAdminFeeSettings,
} from './transaction-gas/session-admin-static-fee';
import { useGetEstimateGas } from './transaction-gas/use-get-estimate-gas';
import { useGetGasPrice } from './transaction-gas/use-get-gas-price';

export interface UseNetworkFeeReturn {
  isLoading: boolean;
  isFetchedPriceTiers: boolean;
  isFetchedEstimateGasInfo: boolean;
  isSimulateError: boolean;
  currentGasInfo: GasInfo | null;
  currentGasFeeRawAmount: number;
  currentStorageDeposits: {
    storageDeposit: number;
    unlockDeposit: number;
    storageUsage: number;
    releaseStorageUsage: number;
  } | null;
  changedGasInfo: GasInfo | null;
  networkFee: NetworkFee | null;
  networkFeeSettingType: NetworkFeeSettingType;
  networkFeeSettings: NetworkFeeSettingInfo[] | null;
  gasAdjustment: string;
  setGasAdjustment: (ratio: string) => void;
  setNetworkFeeSetting: (settingInfo: NetworkFeeSettingInfo) => void;
  save: () => void;
}

const defaultSettingType = NetworkFeeSettingType.AVERAGE;

const NETWORK_FEE_TOO_LOW_MESSAGE = 'Network fee too low';

export const useNetworkFee = (
  document?: Document | null,
  isDefaultGasPrice = false,
): UseNetworkFeeReturn => {
  const [currentNetworkFeeSettingType, setCurrentNetworkFeeSettingType] = useState<
    NetworkFeeSettingType
  >(defaultSettingType);
  const [networkFeeSettingType, setNetworkFeeSettingType] = useState<NetworkFeeSettingType>(
    defaultSettingType,
  );

  const [selectedTier, setSelectedTier] = useState(!isDefaultGasPrice);
  const [gasAdjustment, setGasAdjustment] = useState<string>(DEFAULT_GAS_ADJUSTMENT.toString());

  const isStaticSessionAdminFee = isStaticSessionAdminFeeDocument(document);
  const disabledQueryOptions = useMemo(
    () => (isStaticSessionAdminFee ? { enabled: false } : undefined),
    [isStaticSessionAdminFee],
  );

  const { data: gasPrice } = useGetGasPrice();
  const { data: estimatedGas, isFetched: isFetchedEstimateGasInfo } = useGetEstimateGas(
    document,
    disabledQueryOptions,
  );

  // Tiers are derived purely from a single stabilized simulate result — there is
  // no per-tier simulate. Each tier scales the base gasUsed by its rate and the
  // user's gas adjustment; a tier whose budget falls below the base gasUsed is
  // flagged as "Network fee too low".
  const estimatedGasPriceTiers = useMemo<NetworkFeeSettingInfo[] | null>(() => {
    if (!estimatedGas || gasPrice === null || gasPrice === undefined) {
      return null;
    }

    const baseGasUsed = estimatedGas.gasUsed;

    return Object.values(NetworkFeeSettingType).map((settingType) => {
      const tierGasWanted = Number(
        BigNumber(baseGasUsed || DEFAULT_GAS_WANTED)
          .multipliedBy(DEFAULT_GAS_PRICE_RATE[settingType])
          .multipliedBy(gasAdjustment)
          .toFixed(0, BigNumber.ROUND_DOWN),
      );

      const isTooLow = tierGasWanted < baseGasUsed;
      const hasError = estimatedGas.hasError || isTooLow;
      const simulateErrorMessage = estimatedGas.hasError
        ? estimatedGas.simulateErrorMessage
        : isTooLow
        ? NETWORK_FEE_TOO_LOW_MESSAGE
        : null;

      const gasFee = hasError
        ? 0
        : Number(BigNumber(gasPrice).multipliedBy(tierGasWanted).toFixed(0, BigNumber.ROUND_UP));

      return {
        settingType,
        storageDeposits: estimatedGas.storageDeposits,
        gasInfo: {
          gasFee,
          gasUsed: tierGasWanted,
          gasWanted: tierGasWanted,
          gasPrice,
          hasError,
          simulateErrorMessage,
        },
      };
    });
  }, [estimatedGas, gasPrice, gasAdjustment]);

  const staticGasPriceTiers = useMemo(() => makeStaticSessionAdminFeeSettings(document), [
    document,
  ]);
  const gasPriceTiers = staticGasPriceTiers ?? estimatedGasPriceTiers;
  const isFetchedPriceTiers = staticGasPriceTiers ? true : estimatedGasPriceTiers !== null;

  const isLoading = useMemo(() => {
    if (staticGasPriceTiers) {
      return false;
    }

    if (!gasPriceTiers) {
      return true;
    }

    return !isFetchedEstimateGasInfo || !isFetchedPriceTiers;
  }, [staticGasPriceTiers, gasPriceTiers, isFetchedEstimateGasInfo, isFetchedPriceTiers]);

  const currentSettingType = useMemo(() => {
    if (!gasPriceTiers || gasPriceTiers.length <= 0) {
      return NetworkFeeSettingType.AVERAGE;
    }

    return currentNetworkFeeSettingType;
  }, [currentNetworkFeeSettingType, gasPriceTiers]);

  const changedSettingType = useMemo(() => {
    if (!gasPriceTiers || gasPriceTiers.length <= 1) {
      return NetworkFeeSettingType.AVERAGE;
    }

    return networkFeeSettingType;
  }, [networkFeeSettingType, gasPriceTiers]);

  const currentGasInfo = useMemo(() => {
    if (!gasPriceTiers) {
      return null;
    }

    const current = gasPriceTiers.find((setting) => setting.settingType === currentSettingType);
    if (!current?.gasInfo) {
      return {
        gasFee: 0,
        gasUsed: 0,
        gasWanted: 0,
        gasPrice: 0,
        hasError: true,
        simulateErrorMessage: null,
      };
    }

    return current?.gasInfo || null;
  }, [gasPriceTiers, currentSettingType]);

  const currentStorageDeposits = useMemo(() => {
    if (!gasPriceTiers) {
      return null;
    }

    const current = gasPriceTiers.find((setting) => setting.settingType === currentSettingType);
    if (!current?.storageDeposits) {
      return {
        storageDeposit: 0,
        unlockDeposit: 0,
        storageUsage: 0,
        releaseStorageUsage: 0,
      };
    }

    return current?.storageDeposits || null;
  }, [gasPriceTiers, currentSettingType]);

  const isSimulateError = useMemo(() => {
    if (staticGasPriceTiers) {
      return false;
    }

    if (currentGasInfo?.hasError) {
      return true;
    }

    if (!isFetchedEstimateGasInfo && !estimatedGas) {
      return true;
    }

    return false;
  }, [staticGasPriceTiers, isFetchedEstimateGasInfo, estimatedGas, currentGasInfo]);

  const changedGasInfo = useMemo(() => {
    if (!gasPriceTiers) {
      return null;
    }

    const current = gasPriceTiers.find((setting) => setting.settingType === changedSettingType);

    return current?.gasInfo || null;
  }, [changedSettingType, gasPriceTiers]);

  const currentGasFeeRawAmount = useMemo(() => {
    if (!currentGasInfo) {
      return BigNumber(document?.fee.amount?.[0].amount || 0).toNumber();
    }

    const currentGasFeeAmount = BigNumber(currentGasInfo.gasFee).toFixed(0, BigNumber.ROUND_UP);

    return Number(currentGasFeeAmount);
  }, [currentGasInfo?.gasFee, document, selectedTier]);

  const networkFee = useMemo(() => {
    if (!currentGasInfo) {
      return null;
    }

    const networkFeeAmount = convertRawGasAmountToDisplayAmount(currentGasInfo.gasFee);

    return {
      amount: networkFeeAmount,
      denom: GasToken.symbol,
    };
  }, [currentGasInfo]);

  const setNetworkFeeSetting = useCallback((settingInfo: NetworkFeeSettingInfo): void => {
    setNetworkFeeSettingType(settingInfo.settingType);
  }, []);

  const save = useCallback((): void => {
    setCurrentNetworkFeeSettingType(changedSettingType);
    setSelectedTier(true);
  }, [changedSettingType]);

  return {
    isLoading,
    isFetchedEstimateGasInfo: staticGasPriceTiers ? true : isFetchedEstimateGasInfo,
    isFetchedPriceTiers: staticGasPriceTiers
      ? true
      : isFetchedEstimateGasInfo && isFetchedPriceTiers,
    isSimulateError,
    currentGasInfo,
    currentStorageDeposits,
    currentGasFeeRawAmount,
    changedGasInfo,
    networkFeeSettingType: changedSettingType,
    networkFeeSettings: gasPriceTiers || null,
    setNetworkFeeSetting,
    gasAdjustment,
    setGasAdjustment,
    networkFee,
    save,
  };
};
