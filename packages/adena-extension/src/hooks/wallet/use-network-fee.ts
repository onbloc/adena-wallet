import { GasToken } from '@common/constants/token.constant';
import { GasPrice, NetworkFee, NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import { Document } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useCallback, useMemo, useState } from 'react';
import { useGetEstimateGas } from './transaction-gas/use-get-estimate-gas';
import { useGetGasPriceTires } from './transaction-gas/use-get-gas-price';

export interface UseNetworkFeeReturn {
  currentGasPrice: GasPrice | null;
  currentGasPriceRawAmount: number;
  changedGasPrice: GasPrice | null;
  networkFee: NetworkFee | null;
  networkFeeSettings: NetworkFeeSettingInfo[];
  networkFeeSettingType: NetworkFeeSettingType;
  setNetworkFeeSetting: (settingInfo: NetworkFeeSettingInfo) => void;
  save: () => void;
}

const defaultSettingType = NetworkFeeSettingType.AVERAGE;
const defaultCustomGasPrice = '1';

export const useNetworkFee = (document?: Document | null): UseNetworkFeeReturn => {
  const [currentNetworkFeeSettingType, setCurrentNetworkFeeSettingType] =
    useState<NetworkFeeSettingType>(defaultSettingType);
  const [networkFeeSettingType, setNetworkFeeSettingType] =
    useState<NetworkFeeSettingType>(defaultSettingType);
  const [customGasPriceAmount, setCustomGasPriceAmount] = useState<string>('');
  const { data: gasPriceTiers } = useGetGasPriceTires();

  const currentSettingType = useMemo(() => {
    if (!gasPriceTiers || gasPriceTiers.length <= 1) {
      return NetworkFeeSettingType.CUSTOM;
    }

    return currentNetworkFeeSettingType;
  }, [currentNetworkFeeSettingType, gasPriceTiers]);

  const changedSettingType = useMemo(() => {
    if (!gasPriceTiers || gasPriceTiers.length <= 1) {
      return NetworkFeeSettingType.CUSTOM;
    }

    return networkFeeSettingType;
  }, [networkFeeSettingType, gasPriceTiers]);

  const networkFeeSettings = useMemo(() => {
    if (!gasPriceTiers) {
      return [];
    }

    return gasPriceTiers;
  }, [gasPriceTiers]);

  const currentGasPrice = useMemo(() => {
    if (currentSettingType === NetworkFeeSettingType.CUSTOM) {
      return {
        amount: customGasPriceAmount || defaultCustomGasPrice,
        denom: GasToken.symbol,
      };
    }

    const current = networkFeeSettings.find(
      (setting) => setting.settingType === currentSettingType,
    );

    return current?.gasPrice || null;
  }, [currentSettingType, networkFeeSettings, customGasPriceAmount]);

  const changedGasPrice = useMemo(() => {
    if (changedSettingType === NetworkFeeSettingType.CUSTOM) {
      return {
        amount: customGasPriceAmount,
        denom: GasToken.symbol,
      };
    }

    const current = networkFeeSettings.find(
      (setting) => setting.settingType === changedSettingType,
    );

    return current?.gasPrice || null;
  }, [changedSettingType, networkFeeSettings, customGasPriceAmount]);

  const currentGasPriceRawAmount = useMemo(() => {
    const currentGasPriceAmount = currentGasPrice?.amount || defaultCustomGasPrice;

    return BigNumber(currentGasPriceAmount).shiftedBy(GasToken.decimals).toNumber();
  }, [currentGasPrice]);

  const { data: estimatedGas } = useGetEstimateGas(document, currentGasPriceRawAmount.toString());

  const networkFee = useMemo(() => {
    if (!estimatedGas) {
      return null;
    }

    return {
      amount: BigNumber(estimatedGas)
        .shiftedBy(GasToken.decimals * -1)
        .toString(),
      denom: GasToken.symbol,
    };
  }, [currentGasPrice, estimatedGas]);

  const setNetworkFeeSetting = useCallback((settingInfo: NetworkFeeSettingInfo): void => {
    setNetworkFeeSettingType(settingInfo.settingType);

    if (settingInfo.settingType === NetworkFeeSettingType.CUSTOM) {
      setCustomGasPriceAmount(settingInfo.gasPrice?.amount || '');
    } else {
      setCustomGasPriceAmount('');
    }
  }, []);

  const save = useCallback((): void => {
    setCurrentNetworkFeeSettingType(changedSettingType);
  }, [changedSettingType]);

  return {
    currentGasPrice,
    currentGasPriceRawAmount,
    changedGasPrice,
    networkFeeSettingType: changedSettingType,
    setNetworkFeeSetting,
    networkFeeSettings,
    networkFee,
    save,
  };
};
