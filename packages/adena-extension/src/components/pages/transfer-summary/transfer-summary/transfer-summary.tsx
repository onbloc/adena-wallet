import React, { useMemo } from 'react';

import { SubHeader } from '@components/atoms';

import ArrowLeftIcon from '@assets/arrowL-left.svg';
import ArrowDownIcon from '@assets/transfer-arrow-down.svg';
import TransferSummaryAddress from '../transfer-summary-address/transfer-summary-address';
import TransferSummaryBalance from '../transfer-summary-balance/transfer-summary-balance';
import { TransferSummaryWrapper } from './transfer-summary.styles';

import { TransactionValidationError } from '@common/errors/validation/transaction-validation-error';
import NetworkFee from '@components/molecules/network-fee/network-fee';
import { Amount, NetworkFee as NetworkFeeType, TokenModel } from '@types';

export interface TransferSummaryProps {
  tokenMetainfo: TokenModel;
  tokenImage: string;
  transferBalance: Amount;
  toAddress: string;
  networkFee: NetworkFeeType | null;
  memo: string;
  isErrorNetworkFee?: boolean;
  isLoadingNetworkFee?: boolean;
  onClickBack: () => void;
  onClickCancel: () => void;
  onClickSend: () => void;
  onClickNetworkFeeSetting: () => void;
}

const TransferSummary: React.FC<TransferSummaryProps> = ({
  tokenMetainfo,
  tokenImage,
  transferBalance,
  toAddress,
  networkFee,
  memo,
  isErrorNetworkFee,
  isLoadingNetworkFee,
  onClickBack,
  onClickCancel,
  onClickSend,
  onClickNetworkFeeSetting,
}) => {
  const insufficientNetworkFeeError = new TransactionValidationError('INSUFFICIENT_NETWORK_FEE');

  const disabledSendButton = useMemo(() => {
    return isLoadingNetworkFee || isErrorNetworkFee;
  }, [isLoadingNetworkFee, isErrorNetworkFee]);

  const errorMessage = useMemo(() => {
    if (!isErrorNetworkFee) {
      return '';
    }

    return insufficientNetworkFeeError.message;
  }, [isErrorNetworkFee, insufficientNetworkFeeError.message]);

  return (
    <TransferSummaryWrapper>
      <div className='sub-header-wrapper'>
        <SubHeader
          leftElement={{
            element: <img src={`${ArrowLeftIcon}`} alt={'back image'} />,
            onClick: onClickBack,
          }}
          title={`Sending ${tokenMetainfo.symbol}`}
        />
      </div>

      <div className='info-wrapper'>
        <TransferSummaryBalance
          tokenImage={tokenImage}
          value={transferBalance.value}
          denom={transferBalance.denom}
        />

        <div className='direction-icon-wrapper'>
          <img src={`${ArrowDownIcon}`} alt='direction-icon' />
        </div>

        <TransferSummaryAddress toAddress={toAddress} memo={memo} />
      </div>

      <div className='network-fee-wrapper'>
        <NetworkFee
          isError={isErrorNetworkFee}
          isLoading={isLoadingNetworkFee}
          value={networkFee?.amount || ''}
          denom={networkFee?.denom || ''}
          errorMessage={errorMessage}
          onClickSetting={onClickNetworkFeeSetting}
        />
      </div>

      <div className='button-group'>
        <button className='cancel' onClick={onClickCancel}>
          Cancel
        </button>
        <button className={disabledSendButton ? 'send disabled' : 'send'} onClick={onClickSend}>
          Send
        </button>
      </div>
    </TransferSummaryWrapper>
  );
};

export default TransferSummary;
