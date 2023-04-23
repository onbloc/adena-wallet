import React from 'react';
import { TransferSummaryWrapper } from './transfer-summary.styles';
import TransferSummaryBalance from '../transfer-summary-balance/transfer-summary-balance';
import TransferSummaryAddress from '../transfer-summary-address/transfer-summary-address';
import TransferSummaryNetworkFee from '../transfer-summary-network-fee/transfer-summary-network-fee';
import ArrowDownIcon from '@assets/transfer-arrow-down.svg';

export interface TransferSummaryProps {
  tokenImage: string;
  transferBalance: string;
  toAddress: string;
  networkFee: {
    value: string;
    denom: string;
  };
  onClickCancel: () => void;
  onClickSend: () => void;
}

const TransferSummary: React.FC<TransferSummaryProps> = ({
  tokenImage,
  transferBalance,
  toAddress,
  networkFee,
  onClickCancel,
  onClickSend,
}) => {
  return (
    <TransferSummaryWrapper>
      <div className='info-wrapper'>
        <TransferSummaryBalance
          tokenImage={tokenImage}
          transferBalance={transferBalance}
        />

        <div className='direction-icon-wrapper'>
          <img src={`${ArrowDownIcon}`} alt='direction-icon' />
        </div>

        <TransferSummaryAddress toAddress={toAddress} />
      </div>

      <div className='network-fee-wrapper'>
        <TransferSummaryNetworkFee
          value={networkFee.value}
          denom={networkFee.denom}
        />
      </div>

      <div className='button-group'>
        <button className='cancel' onClick={onClickCancel}>Cancel</button>
        <button className='send' onClick={onClickSend}>Send</button>
      </div>
    </TransferSummaryWrapper>
  );
};

export default TransferSummary;