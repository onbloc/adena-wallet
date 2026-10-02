import React, { useMemo } from 'react';

import IconRight from '@assets/icon-right';
import { TokenBalance } from '@components/molecules';
import FeeAmountUSD from '@components/molecules/fee-amount-usd/fee-amount-usd';
import { TokenPrice } from '@types';
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
  /**
   * Quote for the token the fee is charged in, from `useFeeTokenPrice`. The
   * screen resolves it so this stays presentational; without one the row keeps
   * its single-line, amount-only shape.
   */
  feeTokenPrice?: TokenPrice | null;
  onClickSetting?: () => void;
}

const NetworkFee: React.FC<NetworkFeeProps> = ({
  value,
  denom,
  isLoading = false,
  isError,
  errorMessage,
  feeTokenPrice,
  onClickSetting,
}) => {
  const hasSetting = !!onClickSetting;

  const isEmptyValue = value === '';

  const hasError = useMemo(() => {
    if (isLoading) {
      return false;
    }

    return isError || !!errorMessage;
  }, [isLoading, isError, errorMessage]);

  const displayErrorMessage = useMemo(() => {
    if (!hasError || isEmptyValue) {
      return '';
    }

    return errorMessage;
  }, [hasError, isEmptyValue, errorMessage]);

  return (
    <NetworkFeeContainer>
      <NetworkFeeWrapper $error={hasError && !isEmptyValue ? 1 : 0}>
        <span className='key'>{'Network Fee'}</span>

        <div className='network-fee-amount-wrapper'>
          <div className='network-fee-amount'>
            <NetworkFeeAmount value={value} denom={denom} isLoading={isLoading} />

            {!isLoading && <FeeAmountUSD value={value} price={feeTokenPrice ?? undefined} />}
          </div>

          {hasSetting && !isLoading && !isEmptyValue && (
            <button className='setting-button' onClick={onClickSetting}>
              <IconRight />
            </button>
          )}
        </div>
      </NetworkFeeWrapper>

      {displayErrorMessage && <span className='error-message'>{displayErrorMessage}</span>}
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
