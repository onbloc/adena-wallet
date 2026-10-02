import React, { useMemo } from 'react';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import InfoTooltip from '@components/atoms/info-tooltip/info-tooltip';
import FeeAmount from '@components/molecules/fee-amount/fee-amount';
import theme from '@styles/theme';
import { FeeTokenQuote } from '@hooks/wallet/use-fee-token-price';
import BigNumber from 'bignumber.js';
import {
  StorageDepositContainer,
  StorageDepositItemSkeletonBox,
  StorageDepositWrapper,
} from './storage-deposit.styles';

export interface StorageDepositProps {
  storageDeposit: {
    storageDeposit: number;
    unlockDeposit: number;
  };
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  showPlaceholder?: boolean;
  /**
   * Quote for GNOT, from `useFeeTokenPrice`. The screen resolves it so this
   * stays presentational; with one the row reads in USD, without one it falls
   * back to the token amount.
   */
  feeTokenQuote?: FeeTokenQuote | null;
}

const storageDepositTooltipMessage = `The total amount of GNOT deposited or
released for storage usage by this
transaction.`;

const StorageDeposit: React.FC<StorageDepositProps> = ({
  storageDeposit,
  isLoading = false,
  isError,
  errorMessage,
  showPlaceholder = false,
  feeTokenQuote,
}) => {
  const isEmptyValue = useMemo(() => {
    return storageDeposit.storageDeposit === 0 && storageDeposit.unlockDeposit === 0;
  }, [storageDeposit.storageDeposit, storageDeposit.unlockDeposit]);

  const hasError = useMemo(() => {
    if (isLoading) {
      return false;
    }

    return isError;
  }, [isLoading, isError]);

  const depositAmount = useMemo(() => {
    if (isEmptyValue) {
      return 0;
    }

    return Math.abs(storageDeposit.storageDeposit - storageDeposit.unlockDeposit);
  }, [isEmptyValue, storageDeposit.storageDeposit]);

  const isRefundable = useMemo(() => {
    if (isEmptyValue) {
      return false;
    }

    return storageDeposit.unlockDeposit > storageDeposit.storageDeposit;
  }, [isEmptyValue, storageDeposit.unlockDeposit, storageDeposit.storageDeposit]);

  return (
    <StorageDepositContainer>
      <StorageDepositWrapper $error={hasError ? 1 : 0}>
        <span className='key'>
          {'Storage Deposit'}

          <InfoTooltip content={storageDepositTooltipMessage} />
        </span>

        <div className='storage-deposit-amount-wrapper'>
          <StorageDepositAmount
            value={depositAmount}
            isRefundable={isRefundable}
            isLoading={isLoading}
            showPlaceholder={showPlaceholder}
            quote={feeTokenQuote}
          />
        </div>
      </StorageDepositWrapper>

      {errorMessage && <span className='error-message'>{errorMessage}</span>}
    </StorageDepositContainer>
  );
};

const StorageDepositAmount: React.FC<{
  value: number;
  isRefundable: boolean;
  isLoading: boolean;
  showPlaceholder?: boolean;
  quote: FeeTokenQuote | null | undefined;
}> = ({ value, isRefundable, isLoading, showPlaceholder = false, quote }) => {
  const fontColor = isRefundable ? theme.green._5 : theme.neutral._1;

  const amount = useMemo(() => {
    if (value === 0) {
      return {
        value: '0',
        denom: GNOT_TOKEN.symbol,
      };
    }

    const valueWithDecimals = BigNumber(value)
      .shiftedBy(GNOT_TOKEN.decimals * -1)
      .toFormat(GNOT_TOKEN.decimals);

    return {
      value: valueWithDecimals,
      denom: GNOT_TOKEN.symbol,
    };
  }, [value]);

  if (isLoading) {
    return <StorageDepositItemSkeletonBox />;
  }

  if (showPlaceholder) {
    return <span className='value'>{'-'}</span>;
  }

  return (
    <FeeAmount
      value={amount.value}
      denom={amount.denom}
      quote={quote}
      fontColor={fontColor}
      withSign={isRefundable}
    />
  );
};

export default StorageDeposit;
