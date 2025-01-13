import React, { useCallback, useMemo } from 'react';

import ArrowLeftIcon from '@assets/arrowL-left.svg';
import { SubHeader } from '@components/atoms';
import { GasPrice, NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';

import { BottomFixedButton } from '@components/molecules';
import NetworkFeeSettingItem from '@components/molecules/network-fee-setting-item/network-fee-setting-item';
import BigNumber from 'bignumber.js';
import { NetworkFeeSettingWrapper } from './network-fee-setting.styles';

export interface NetworkFeeSettingProps {
  isFetchedPriceTiers: boolean;
  changedGasPrice: GasPrice | null;
  networkFeeSettingType: NetworkFeeSettingType;
  setNetworkFeeSetting: (settingInfo: NetworkFeeSettingInfo) => void;
  gasPriceRatio: string;
  setGasPriceRatio: (ratio: string) => void;
  networkFeeSettings: NetworkFeeSettingInfo[];
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
  changedGasPrice,
  networkFeeSettingType,
  setNetworkFeeSetting,
  networkFeeSettings,
  onClickBack,
  onClickSave,
}) => {
  const settingInfoMap = useMemo(() => {
    return networkFeeSettings.reduce(
      (acc, setting) => {
        acc[setting.settingType] = setting;
        return acc;
      },
      {} as Record<NetworkFeeSettingType, NetworkFeeSettingInfo>,
    );
  }, [networkFeeSettings]);

  const settingInfos = useMemo(() => {
    return settingTypesOfList.map((settingType) => ({
      ...settingInfoMap[settingType],
      settingType,
    }));
  }, [settingInfoMap]);

  const enabledSaveButton = useMemo(() => {
    if (!changedGasPrice?.amount) {
      return false;
    }

    return BigNumber(changedGasPrice.amount).gt(0);
  }, [changedGasPrice]);

  const isSelected = useCallback(
    (settingInfo: NetworkFeeSettingInfo) => {
      return settingInfo.settingType === networkFeeSettingType;
    },
    [networkFeeSettingType],
  );

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
              select={(): void => setNetworkFeeSetting(settingInfo)}
            />
          ))}
        </div>

        {/* We need more information about the gas estimation.
        <div className='custom-network-fee-input-wrapper'>
          <NetworkFeeCustomInput value={gasPriceRatio} onChange={onChangeCustomFee} />
        </div> 
        */}
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
