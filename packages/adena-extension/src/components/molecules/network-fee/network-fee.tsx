import React, { useMemo } from 'react';

import IconRight from '@assets/icon-right';
import { TokenBalance } from '@components/molecules';
import {
  NetworkFeeContainer,
  NetworkFeeItemSkeletonBox,
  NetworkFeeWrapper,
} from './network-fee.styles';

export interface NetworkFeeProps {
  value: string;
  denom: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onClickSetting?: () => void;
}

const NetworkFee: React.FC<NetworkFeeProps> = ({
  value,
  denom,
  isLoading = false,
  isError,
  errorMessage,
  onClickSetting,
}) => {
  const hasSetting = !!onClickSetting;

  const isEmptyValue = value === '';

  const hasError = useMemo(() => {
    if (isLoading) {
      return false;
    }

    return isError || !!errorMessage;
  }, [isError, errorMessage]);

  return (
    <NetworkFeeContainer>
      <NetworkFeeWrapper isError={hasError && !isEmptyValue}>
        <span className='key'>{'Network Fee'}</span>

        <div className='network-fee-amount-wrapper'>
          <NetworkFeeAmount value={value} denom={denom} isLoading={isLoading} />

          {hasSetting && !isLoading && (
            <button className='setting-button' onClick={onClickSetting}>
              <IconRight />
            </button>
          )}
        </div>
      </NetworkFeeWrapper>

      {hasError && !isEmptyValue && <span className='error-message'>{errorMessage}</span>}
    </NetworkFeeContainer>
  );
};

const NetworkFeeAmount: React.FC<{
  value: string;
  denom: string;
  isLoading: boolean;
}> = ({ value, denom, isLoading }) => {
  const hasNetworkFee = !!Number(value) && !!denom;

  if (isLoading) {
    return <NetworkFeeItemSkeletonBox />;
  }

  if (!hasNetworkFee) {
    return <span className='value'>{'-'}</span>;
  }

  return (
    <TokenBalance
      value={value}
      denom={denom}
      fontStyleKey='body2Reg'
      minimumFontSize='11px'
      orientation='HORIZONTAL'
    />
  );
};

export default NetworkFee;
