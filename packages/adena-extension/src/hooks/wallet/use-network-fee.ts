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
  isFetchedPriceTiers: boolean;
  currentGasInfo: GasInfo | null;
  currentGasFeeRawAmount: number;
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
): UseNetworkFeeReturn => {
  const [currentNetworkFeeSettingType, setCurrentNetworkFeeSettingType] =
    useState<NetworkFeeSettingType>(defaultSettingType);
  const [networkFeeSettingType, setNetworkFeeSettingType] =
    useState<NetworkFeeSettingType>(defaultSettingType);

  const [selectedTier, setSelectedTier] = useState(!isDefaultGasPrice);
  const [gasAdjustment, setGasAdjustment] = useState<string>(DEFAULT_GAS_ADJUSTMENT.toString());

  const { data: defaultEstimatedGasInfo } = useGetDefaultEstimateGasInfo(document);
  const { data: estimatedGasInfo } = useGetEstimateGasInfo(
    document,
    defaultEstimatedGasInfo?.gasUsed || 0,
    defaultEstimatedGasInfo?.gasPrice || 0,
  );

  const { data: gasPriceTiers = null, isFetched: isFetchedPriceTiers } =
    useGetEstimateGasPriceTiers(document, estimatedGasInfo?.gasUsed, gasAdjustment);

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

    return current?.gasInfo || null;
  }, [currentSettingType, gasPriceTiers]);

  const changedGasInfo = useMemo(() => {
    if (!gasPriceTiers) {
      return null;
    }

    const current = gasPriceTiers.find((setting) => setting.settingType === changedSettingType);

    return current?.gasInfo || null;
  }, [changedSettingType, gasPriceTiers]);

  const currentGasFeeRawAmount = useMemo(() => {
    if (!selectedTier) {
      return BigNumber(document?.fee.amount?.[0].amount || 0).toNumber();
    }

    if (!currentGasInfo) {
      return 0;
    }

    const currentGasFeeAmount = BigNumber(currentGasInfo.gasFee).toFixed(0, BigNumber.ROUND_UP);

    return Number(currentGasFeeAmount);
  }, [currentGasInfo, document, selectedTier]);

  const currentEstimateGas = useMemo(() => {
    if (!gasPriceTiers) {
      return null;
    }

    const current = gasPriceTiers.find((setting) => setting.settingType === currentSettingType);

    return current?.gasInfo || null;
  }, [currentSettingType, gasPriceTiers]);

  const networkFee = useMemo(() => {
    if (!selectedTier) {
      return {
        amount: BigNumber(document?.fee.amount?.[0].amount || 0)
          .shiftedBy(-GasToken.decimals)
          .toFixed(GasToken.decimals)
          .replace(/0+$/, ''),
        denom: document?.fee.amount?.[0].denom || GasToken.symbol,
      };
    }

    if (!currentEstimateGas) {
      return null;
    }

    if (currentEstimateGas.hasError) {
      return {
        amount: '0',
        denom: GasToken.symbol,
      };
    }

    const networkFeeAmount = BigNumber(currentEstimateGas.gasFee)
      .shiftedBy(GasToken.decimals * -1)
      .toFixed(6, BigNumber.ROUND_UP)
      .replace(/0+$/, '');

    return {
      amount: networkFeeAmount,
      denom: GasToken.symbol,
    };
  }, [currentEstimateGas, selectedTier]);

  const setNetworkFeeSetting = useCallback((settingInfo: NetworkFeeSettingInfo): void => {
    setNetworkFeeSettingType(settingInfo.settingType);
  }, []);

  const save = useCallback((): void => {
    setCurrentNetworkFeeSettingType(changedSettingType);
    setSelectedTier(true);
  }, [changedSettingType]);

  return {
    isFetchedPriceTiers,
    currentGasInfo,
    currentGasFeeRawAmount,
    changedGasInfo,
    networkFeeSettingType: changedSettingType,
    networkFeeSettings: gasPriceTiers,
    setNetworkFeeSetting,
    gasAdjustment,
    setGasAdjustment,
    networkFee,
    save,
  };
};
