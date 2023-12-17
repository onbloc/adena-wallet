import React from 'react';

import { SubHeader } from '@components/atoms';

import { TransferSummaryWrapper } from './transfer-summary.styles';
import TransferSummaryBalance from '../transfer-summary-balance/transfer-summary-balance';
import TransferSummaryAddress from '../transfer-summary-address/transfer-summary-address';
import TransferSummaryNetworkFee from '../transfer-summary-network-fee/transfer-summary-network-fee';
import ArrowDownIcon from '@assets/transfer-arrow-down.svg';
import ArrowLeftIcon from '@assets/arrowL-left.svg';

import { TokenModel, Amount } from '@types';

export interface TransferSummaryProps {
  tokenMetainfo: TokenModel;
  tokenImage: string;
  transferBalance: Amount;
  toAddress: string;
  networkFee: {
    value: string;
    denom: string;
  };
  isErrorNetworkFee?: boolean;
  onClickBack: () => void;
  onClickCancel: () => void;
  onClickSend: () => void;
}

const TransferSummary: React.FC<TransferSummaryProps> = ({
  tokenMetainfo,
  tokenImage,
  transferBalance,
  toAddress,
  networkFee,
  isErrorNetworkFee,
  onClickBack,
  onClickCancel,
  onClickSend,
}) => {
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

        <TransferSummaryAddress toAddress={toAddress} />
      </div>

      <div className='network-fee-wrapper'>
        <TransferSummaryNetworkFee
          isError={isErrorNetworkFee}
          value={networkFee.value}
          denom={networkFee.denom}
        />
        {isErrorNetworkFee && <span className='error-message'>Insufficient network fee</span>}
      </div>

      <div className='button-group'>
        <button className='cancel' onClick={onClickCancel}>
          Cancel
        </button>
        <button className='send' onClick={onClickSend}>
          Send
        </button>
      </div>
    </TransferSummaryWrapper>
  );
};

export default TransferSummary;
