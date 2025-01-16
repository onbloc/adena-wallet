import { GasToken } from '@common/constants/token.constant';
import { NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import BigNumber from 'bignumber.js';
import React, { useMemo } from 'react';
import { TokenBalance } from '../token-balance';
import {
  NetworkFeeItemSkeletonBox,
  NetworkFeeSettingItemWrapper,
} from './network-fee-setting-item.styles';

export interface NetworkFeeSettingItemProps {
  selected: boolean;
  isLoading: boolean;
  select: () => void;
  info: NetworkFeeSettingInfo;
}

const networkFeeSettingTypeNames: { [key in NetworkFeeSettingType]: string } = {
  [NetworkFeeSettingType.FAST]: 'Fast',
  [NetworkFeeSettingType.AVERAGE]: 'Average',
  [NetworkFeeSettingType.SLOW]: 'Slow',
};

const NetworkFeeSettingItem: React.FC<NetworkFeeSettingItemProps> = ({
  selected,
  isLoading,
  info,
  select,
}) => {
  const settingTypeName = useMemo(
    () => networkFeeSettingTypeNames[info.settingType],
    [info.settingType],
  );

  const hasGasInfo = !!info && !!info.gasInfo;

  const gasInfoAmount = useMemo(() => {
    if (!hasGasInfo || !info?.gasInfo) {
      return '';
    }

    return (
      BigNumber(info.gasInfo.gasFee)
        .shiftedBy(GasToken.decimals * -1)
        .toFixed(6, BigNumber.ROUND_UP)
        .toString()
        .replace(/0+$/, '') || ''
    );
  }, [info.gasInfo]);

  const gasInfoDenomination = useMemo(() => {
    if (!hasGasInfo) {
      return '-';
    }

    return GasToken.symbol;
  }, [info.gasInfo]);

  const onClickItem = (): void => {
    if (!hasGasInfo) {
      return;
    }

    select();
  };

  if (isLoading) {
    return (
      <NetworkFeeSettingItemWrapper className='loading'>
        <span className='title'>{settingTypeName}</span>

        <NetworkFeeItemSkeletonBox />
      </NetworkFeeSettingItemWrapper>
    );
  }

  return (
    <NetworkFeeSettingItemWrapper className={selected ? 'selected' : ''} onClick={onClickItem}>
      <span className='title'>{settingTypeName}</span>

      {hasGasInfo ? (
        <TokenBalance
          value={gasInfoAmount}
          denom={gasInfoDenomination}
          fontStyleKey='body2Reg'
          minimumFontSize='11px'
          orientation='HORIZONTAL'
        />
      ) : (
        <span className='no-data'>{'-'}</span>
      )}
    </NetworkFeeSettingItemWrapper>
  );
};

export default NetworkFeeSettingItem;
