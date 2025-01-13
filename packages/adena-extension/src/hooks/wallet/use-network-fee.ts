import { GasToken } from '@common/constants/token.constant';
import { GasPrice, NetworkFee, NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import { Document } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useCallback, useMemo, useState } from 'react';
import { useGetEstimateGas } from './transaction-gas/use-get-estimate-gas';
import { useGetGasPriceTires } from './transaction-gas/use-get-gas-price';
import { useGetSingleEstimateGas } from './transaction-gas/use-get-single-estimate-gas';

export interface UseNetworkFeeReturn {
  currentGasPrice: GasPrice | null;
  currentGasPriceRawAmount: number;
  changedGasPrice: GasPrice | null;
  networkFee: NetworkFee | null;
  networkFeeSettings: NetworkFeeSettingInfo[];
  networkFeeSettingType: NetworkFeeSettingType;
  gasPriceRatio: string;
  setGasPriceRatio: (ratio: string) => void;
  setNetworkFeeSetting: (settingInfo: NetworkFeeSettingInfo) => void;
  save: () => void;
}

const defaultSettingType = NetworkFeeSettingType.AVERAGE;
const defaultGasPriceRatio = '1';

export const useNetworkFee = (
  document?: Document | null,
  isDefaultGasPrice = false,
): UseNetworkFeeReturn => {
  const [currentNetworkFeeSettingType, setCurrentNetworkFeeSettingType] =
    useState<NetworkFeeSettingType>(defaultSettingType);
  const [networkFeeSettingType, setNetworkFeeSettingType] =
    useState<NetworkFeeSettingType>(defaultSettingType);
  const [selectedTier, setSelectedTier] = useState(!isDefaultGasPrice);
  const [gasPriceRatio, setGasPriceRatio] = useState<string>(defaultGasPriceRatio);

  const { data: gasPriceTiers } = useGetGasPriceTires(gasPriceRatio);

  const { data: estimatedGasPriceTiers } = useGetEstimateGas(document, gasPriceTiers);

  const { data: estimatedDefaultGasPrice = null } = useGetSingleEstimateGas(document, {
    enabled: !selectedTier,
  });

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

  const networkFeeSettings = useMemo(() => {
    if (estimatedGasPriceTiers) {
      return estimatedGasPriceTiers;
    }

    return [];
  }, [estimatedGasPriceTiers]);

  const currentGasPrice = useMemo(() => {
    const current = networkFeeSettings.find(
      (setting) => setting.settingType === currentSettingType,
    );

    return current?.gasPrice || null;
  }, [currentSettingType, networkFeeSettings]);

  const changedGasPrice = useMemo(() => {
    const current = networkFeeSettings.find(
      (setting) => setting.settingType === changedSettingType,
    );

    return current?.gasPrice || null;
  }, [changedSettingType, networkFeeSettings]);

  const currentGasPriceRawAmount = useMemo(() => {
    if (!selectedTier) {
      return BigNumber(document?.fee.amount?.[0].amount || 0).toNumber();
    }

    if (!currentGasPrice) {
      return 0;
    }

    const currentGasPriceAmount = currentGasPrice?.amount;

    return BigNumber(currentGasPriceAmount).shiftedBy(GasToken.decimals).toNumber();
  }, [currentGasPrice, document, selectedTier]);

  const currentEstimateGas = useMemo(() => {
    if (!estimatedGasPriceTiers) {
      return 0;
    }

    const current = estimatedGasPriceTiers.find(
      (setting) => setting.settingType === currentSettingType,
    );

    return current?.gasPrice;
  }, [currentSettingType, estimatedGasPriceTiers]);

  const networkFee = useMemo(() => {
    if (!selectedTier) {
      return estimatedDefaultGasPrice;
    }

    if (!currentEstimateGas) {
      return null;
    }

    return {
      amount: currentEstimateGas.estimatedAmount,
      denom: currentEstimateGas.denom,
    };
  }, [currentEstimateGas, estimatedDefaultGasPrice, selectedTier]);

  const setNetworkFeeSetting = useCallback((settingInfo: NetworkFeeSettingInfo): void => {
    setNetworkFeeSettingType(settingInfo.settingType);
  }, []);

  const save = useCallback((): void => {
    setCurrentNetworkFeeSettingType(changedSettingType);
    setSelectedTier(true);
  }, [changedSettingType]);

  return {
    currentGasPrice,
    currentGasPriceRawAmount,
    changedGasPrice,
    networkFeeSettingType: changedSettingType,
    setNetworkFeeSetting,
    gasPriceRatio,
    setGasPriceRatio,
    networkFeeSettings,
    networkFee,
    save,
  };
};
