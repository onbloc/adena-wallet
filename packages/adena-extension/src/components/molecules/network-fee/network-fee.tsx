import React from 'react';

import IconRight from '@assets/icon-right';
import { TokenBalance } from '@components/molecules';
import { NetworkFeeContainer, NetworkFeeWrapper } from './network-fee.styles';

export interface NetworkFeeProps {
  value: string;
  denom: string;
  isError?: boolean;
  errorMessage?: string;
  onClickSetting?: () => void;
}

const NetworkFee: React.FC<NetworkFeeProps> = ({
  value,
  denom,
  isError,
  errorMessage,
  onClickSetting,
}) => {
  const hasSetting = !!onClickSetting;

  const isEmptyValue = value === '' || denom === '';

  const hasNetworkFee = !!Number(value) && !!denom;

  const hasError = isError || !hasNetworkFee;

  return (
    <NetworkFeeContainer>
      <NetworkFeeWrapper isError={hasError && !isEmptyValue}>
        <span className='key'>{'Network Fee'}</span>

        <div className='network-fee-amount-wrapper'>
          {hasNetworkFee ? (
            <TokenBalance
              value={value}
              denom={denom}
              fontStyleKey='body2Reg'
              minimumFontSize='11px'
              orientation='HORIZONTAL'
            />
          ) : (
            <span className='value'>{'-'}</span>
          )}

          {hasSetting && (
            <button className='setting-button' onClick={onClickSetting}>
              <IconRight />
            </button>
          )}
        </div>
      </NetworkFeeWrapper>

      {isError && <span className='error-message'>{errorMessage}</span>}
    </NetworkFeeContainer>
  );
};

export default NetworkFee;
