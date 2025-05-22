import React, { useMemo } from 'react';

import { SubHeader } from '@components/atoms';

import ArrowLeftIcon from '@assets/arrowL-left.svg';
import ArrowDownIcon from '@assets/transfer-arrow-down.svg';
import TransferSummaryAddress from '../transfer-summary-address/transfer-summary-address';
import TransferSummaryBalance from '../transfer-summary-balance/transfer-summary-balance';
import { TransferSummaryWrapper } from './transfer-summary.styles';

import { BottomFixedButtonGroup } from '@components/molecules';
import NetworkFee from '@components/molecules/network-fee/network-fee';
import { UseNetworkFeeReturn } from '@hooks/wallet/use-network-fee';
import { Amount, NetworkFee as NetworkFeeType, TokenModel } from '@types';

export interface TransferSummaryProps {
  tokenMetainfo: TokenModel;
  tokenImage: string;
  transferBalance: Amount;
  toAddress: string;
  networkFee: NetworkFeeType | null;
  memo: string;
  currentBalance: number | null | undefined;
  useNetworkFeeReturn: UseNetworkFeeReturn;
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
  currentBalance,
  useNetworkFeeReturn,
  isErrorNetworkFee,
  onClickBack,
  onClickCancel,
  onClickSend,
  onClickNetworkFeeSetting,
}) => {
  const disabledSendButton = useMemo(() => {
    if (useNetworkFeeReturn.isLoading) {
      return true;
    }

    if (isErrorNetworkFee || useNetworkFeeReturn.isSimulateError) {
      return true;
    }

    return Number(networkFee?.amount || 0) <= 0;
  }, [
    isErrorNetworkFee,
    useNetworkFeeReturn.isLoading,
    useNetworkFeeReturn.isSimulateError,
    networkFee,
  ]);

  const networkFeeErrorMessage = useMemo(() => {
    if (useNetworkFeeReturn.isSimulateError) {
      if (currentBalance !== 0) {
        return 'This transaction cannot be simulated. Try again.';
      }
    }

    if (isErrorNetworkFee) {
      return 'Insufficient network fee';
    }

    return '';
  }, [useNetworkFeeReturn.isSimulateError, isErrorNetworkFee, currentBalance]);

  const simulateErrorMessage = useMemo(() => {
    if (useNetworkFeeReturn.isSimulateError) {
      return useNetworkFeeReturn.currentGasInfo?.simulateErrorMessage || null;
    }

    return null;
  }, [useNetworkFeeReturn.isSimulateError, useNetworkFeeReturn.currentGasInfo]);

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
          value={networkFee?.amount || ''}
          denom={networkFee?.denom || ''}
          isError={useNetworkFeeReturn.isSimulateError || isErrorNetworkFee}
          isLoading={useNetworkFeeReturn.isLoading}
          errorMessage={networkFeeErrorMessage}
          simulateErrorMessage={simulateErrorMessage}
          onClickSetting={onClickNetworkFeeSetting}
        />
      </div>
      {simulateErrorMessage !== null && <div className='button-group' />}

      <BottomFixedButtonGroup
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel,
        }}
        rightButton={{
          text: 'Send',
          primary: true,
          onClick: onClickSend,
          disabled: disabledSendButton,
        }}
      />
    </TransferSummaryWrapper>
  );
};

export default TransferSummary;
