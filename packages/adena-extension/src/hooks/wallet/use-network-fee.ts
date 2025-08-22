import { DEFAULT_GAS_ADJUSTMENT } from '@common/constants/gas.constant';
import { GasToken } from '@common/constants/token.constant';
import { GasInfo, NetworkFee, NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import { Document } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useCallback, useMemo, useState } from 'react';
import {
  useGetDefaultEstimateGasInfo,
  useGetEstimateGasInfo,
} from './transaction-gas/use-get-estimate-gas-info';
import { useGetEstimateGasPriceTiers } from './transaction-gas/use-get-estimate-gas-price-tiers';

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

export const useNetworkFee = (
  document?: Document | null,
  isDefaultGasPrice = false,
  gasInfo?: GasInfo | null,
): UseNetworkFeeReturn => {
  const [currentNetworkFeeSettingType, setCurrentNetworkFeeSettingType] =
    useState<NetworkFeeSettingType>(defaultSettingType);
  const [networkFeeSettingType, setNetworkFeeSettingType] =
    useState<NetworkFeeSettingType>(defaultSettingType);

  const [selectedTier, setSelectedTier] = useState(!isDefaultGasPrice);
  const [gasAdjustment, setGasAdjustment] = useState<string>(DEFAULT_GAS_ADJUSTMENT.toString());

  const { data: defaultEstimatedGasInfo, isFetched: isFetchedDefaultEstimatedGasInfo } =
    useGetDefaultEstimateGasInfo(document);
  const { data: estimatedGasInfo, isFetched: isFetchedEstimateGasInfo } = useGetEstimateGasInfo(
    document,
    gasInfo?.gasUsed || defaultEstimatedGasInfo?.gasUsed || 0,
  );

  const { data: gasPriceTiers, isFetched: isFetchedPriceTiers } = useGetEstimateGasPriceTiers(
    document,
    gasInfo?.gasUsed || estimatedGasInfo?.gasUsed,
    gasAdjustment,
  );

  const isLoading = useMemo(() => {
    if (gasPriceTiers === undefined) {
      return true;
    }

    if (!isFetchedDefaultEstimatedGasInfo || !isFetchedEstimateGasInfo || !isFetchedPriceTiers) {
      return true;
    }

    return false;
  }, [
    gasPriceTiers,
    isFetchedDefaultEstimatedGasInfo,
    isFetchedEstimateGasInfo,
    isFetchedPriceTiers,
  ]);

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
    if (currentGasInfo?.hasError) {
      return true;
    }

    if (!isFetchedDefaultEstimatedGasInfo && !defaultEstimatedGasInfo) {
      return true;
    }

    return false;
  }, [isFetchedDefaultEstimatedGasInfo, defaultEstimatedGasInfo, currentGasInfo]);

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

    const networkFeeAmount = BigNumber(currentGasInfo.gasFee)
      .shiftedBy(-GasToken.decimals)
      .toFixed(GasToken.decimals)
      .replace(/(\.\d*?)0+$/, '$1')
      .replace(/\.$/, '');

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
    isFetchedEstimateGasInfo,
    isFetchedPriceTiers: isFetchedEstimateGasInfo && isFetchedPriceTiers,
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
