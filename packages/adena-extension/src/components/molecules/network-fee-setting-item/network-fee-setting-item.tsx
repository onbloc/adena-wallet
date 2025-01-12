import { NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import React, { useMemo } from 'react';
import { TokenBalance } from '../token-balance';
import { NetworkFeeSettingItemWrapper } from './network-fee-setting-item.styles';

export interface NetworkFeeSettingItemProps {
  selected: boolean;
  select: () => void;
  info: NetworkFeeSettingInfo;
}

const networkFeeSettingTypeNames: { [key in NetworkFeeSettingType]: string } = {
  [NetworkFeeSettingType.FAST]: 'Fast',
  [NetworkFeeSettingType.AVERAGE]: 'Average',
  [NetworkFeeSettingType.SLOW]: 'Slow',
  [NetworkFeeSettingType.CUSTOM]: 'Custom',
};

const NetworkFeeSettingItem: React.FC<NetworkFeeSettingItemProps> = ({
  selected,
  info,
  select,
}) => {
  const settingTypeName = useMemo(
    () => networkFeeSettingTypeNames[info.settingType],
    [info.settingType],
  );

  const hasGasPrice = !!info && !!info.gasPrice;

  const gasPriceAmount = useMemo(() => {
    if (!hasGasPrice) {
      return '';
    }

    return info?.gasPrice?.amount || '';
  }, [hasGasPrice]);

  const gasPriceDenomination = useMemo(() => {
    if (!hasGasPrice) {
      return '-';
    }

    return info?.gasPrice?.denom || '';
  }, [hasGasPrice]);

  const onClickItem = (): void => {
    if (!hasGasPrice) {
      return;
    }

    select();
  };

  return (
    <NetworkFeeSettingItemWrapper className={selected ? 'selected' : ''} onClick={onClickItem}>
      <span className='title'>{settingTypeName}</span>

      {hasGasPrice ? (
        <TokenBalance
          value={gasPriceAmount}
          denom={gasPriceDenomination}
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
