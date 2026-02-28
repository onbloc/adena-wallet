import React, { useMemo } from 'react';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import InfoTooltip from '@components/atoms/info-tooltip/info-tooltip';
import { TokenBalance } from '@components/molecules';
import theme from '@styles/theme';
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
      <StorageDepositWrapper error={hasError ? 1 : 0}>
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
}> = ({ value, isRefundable, isLoading, showPlaceholder = false }) => {
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
    <TokenBalance
      value={amount.value}
      denom={amount.denom}
      fontColor={fontColor}
      fontStyleKey='body2Reg'
      minimumFontSize='11px'
      orientation='HORIZONTAL'
      withSign={isRefundable}
    />
  );
};

export default StorageDeposit;
