import React, { useCallback, useMemo } from 'react';

import ArrowLeftIcon from '@assets/arrowL-left.svg';
import { SubHeader } from '@components/atoms';
import { GasInfo, NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';

import { DEFAULT_GAS_ADJUSTMENT } from '@common/constants/gas.constant';
import { BottomFixedButton } from '@components/molecules';
import NetworkFeeCustomInput from '@components/molecules/network-fee-custom-input/network-fee-custom-input';
import NetworkFeeSettingItem from '@components/molecules/network-fee-setting-item/network-fee-setting-item';
import BigNumber from 'bignumber.js';
import { NetworkFeeSettingWrapper } from './network-fee-setting.styles';

export interface NetworkFeeSettingProps {
  isFetchedPriceTiers: boolean;
  changedGasInfo: GasInfo | null;
  networkFeeSettingType: NetworkFeeSettingType;
  setNetworkFeeSetting: (settingInfo: NetworkFeeSettingInfo) => void;
  gasAdjustment: string;
  setGasAdjustment: (ratio: string) => void;
  networkFeeSettings: NetworkFeeSettingInfo[] | null;
  onClickBack: () => void;
  onClickSave: () => void;
}

const settingTypesOfList: NetworkFeeSettingType[] = [
  NetworkFeeSettingType.FAST,
  NetworkFeeSettingType.AVERAGE,
  NetworkFeeSettingType.SLOW,
];

const NetworkFeeSetting: React.FC<NetworkFeeSettingProps> = ({
  isFetchedPriceTiers,
  changedGasInfo,
  networkFeeSettingType,
  setNetworkFeeSetting,
  networkFeeSettings,
  gasAdjustment,
  setGasAdjustment,
  onClickBack,
  onClickSave,
}) => {
  const settingInfoMap = useMemo(() => {
    if (!networkFeeSettings) {
      return {
        [NetworkFeeSettingType.FAST]: null,
        [NetworkFeeSettingType.AVERAGE]: null,
        [NetworkFeeSettingType.SLOW]: null,
      };
    }

    return networkFeeSettings.reduce(
      (acc, setting) => {
        acc[setting.settingType] = setting;
        return acc;
      },
      {} as Record<NetworkFeeSettingType, NetworkFeeSettingInfo | null>,
    );
  }, [networkFeeSettings]);

  const settingInfos = useMemo(() => {
    return settingTypesOfList.map((settingType) => ({
      ...settingInfoMap[settingType],
      settingType,
    }));
  }, [settingInfoMap]);

  const enabledSaveButton = useMemo(() => {
    if (!changedGasInfo) {
      return false;
    }

    return BigNumber(changedGasInfo.gasFee).gt(0);
  }, [changedGasInfo]);

  const isSelected = useCallback(
    (settingInfo: { settingType: NetworkFeeSettingType; gasInfo?: GasInfo | undefined }) => {
      return settingInfo?.settingType === networkFeeSettingType;
    },
    [networkFeeSettingType],
  );

  const changeGasAdjustment = useCallback((value: string): string => {
    if (BigNumber(value).isNaN()) {
      return DEFAULT_GAS_ADJUSTMENT.toString();
    }

    // 3 is the maximum value of gas adjustment
    if (BigNumber(value).isGreaterThan(3)) {
      return '3';
    }

    if (BigNumber(value).isLessThan(0)) {
      return '0';
    }

    setGasAdjustment(value);

    return value;
  }, []);

  return (
    <NetworkFeeSettingWrapper>
      <SubHeader
        title='Network Fee Setting'
        leftElement={{
          onClick: onClickBack,
          element: <img src={`${ArrowLeftIcon}`} alt={'back image'} />,
        }}
      />

      <div className='content-wrapper'>
        <div className='settings-wrapper'>
          {settingInfos.map((settingInfo, index) => (
            <NetworkFeeSettingItem
              key={index}
              selected={isSelected(settingInfo)}
              isLoading={!isFetchedPriceTiers}
              info={settingInfo}
              select={(): void =>
                setNetworkFeeSetting({
                  settingType: settingInfo.settingType,
                  gasInfo: {
                    ...(settingInfo.gasInfo || {
                      gasFee: 0,
                      gasPrice: 0,
                      gasUsed: 0,
                      gasWanted: 0,
                      simulateErrorMessage: null,
                    }),
                  },
                })
              }
            />
          ))}
        </div>

        <div className='custom-network-fee-input-wrapper'>
          <NetworkFeeCustomInput value={gasAdjustment} changeValue={changeGasAdjustment} />
        </div>
      </div>

      <BottomFixedButton
        hierarchy='primary'
        fill={false}
        text='Save'
        onClick={onClickSave}
        disabled={!enabledSaveButton}
      />
    </NetworkFeeSettingWrapper>
  );
};

export default NetworkFeeSetting;
