import React, { useMemo } from 'react';

import IconRight from '@assets/icon-right';
import FeeAmount from '@components/molecules/fee-amount/fee-amount';
import { FeeTokenQuote } from '@hooks/wallet/use-fee-token-price';
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
   * screen resolves it so this stays presentational; with one the row reads in
   * USD, without one it falls back to the token amount.
   */
  feeTokenQuote?: FeeTokenQuote | null;
  onClickSetting?: () => void;
}

const NetworkFee: React.FC<NetworkFeeProps> = ({
  value,
  denom,
  isLoading = false,
  isError,
  errorMessage,
  feeTokenQuote,
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
          <NetworkFeeAmount
            value={value}
            denom={denom}
            isLoading={isLoading}
            feeTokenQuote={feeTokenQuote}
          />

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
  feeTokenQuote?: FeeTokenQuote | null;
}> = ({ value, denom, isLoading, feeTokenQuote }) => {
  const hasNetworkFee = !!Number(value) && !!denom;

  if (isLoading) {
    return <NetworkFeeItemSkeletonBox />;
  }

  if (!hasNetworkFee) {
    return <span className='value'>{'-'}</span>;
  }

  return <FeeAmount value={value} denom={denom} quote={feeTokenQuote} />;
};

export default NetworkFee;
