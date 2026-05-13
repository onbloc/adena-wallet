import React, { useMemo } from 'react';

import { SubHeader } from '@components/atoms';

import ArrowLeftIcon from '@assets/arrowL-left.svg';
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
  chainName: string;
  chainBadgeImage?: string;
  networkFee: NetworkFeeType | null;
  memo: string;
  currentBalance: number | null | undefined;
  useNetworkFeeReturn: UseNetworkFeeReturn;
  isErrorNetworkFee?: boolean;
  isLoadingNetworkFee?: boolean;
  simulateErrorBannerMessage?: string | null;
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
  chainName,
  chainBadgeImage,
  networkFee,
  memo,
  useNetworkFeeReturn,
  isErrorNetworkFee,
  isLoadingNetworkFee,
  simulateErrorBannerMessage,
  onClickBack,
  onClickCancel,
  onClickSend,
  onClickNetworkFeeSetting,
}) => {
  // TEMP (Phase 3 MVP): when the container supplies an explicit loading override
  // it is also telling us "I'm providing the fee externally — don't rely on any
  // of the Gno useNetworkFee hook state (loading, simulate error, etc.)". The
  // Cosmos path uses this with a hardcoded fee.
  // TODO(Phase 6): replace with a unified network-fee abstraction once feemarket
  //                estimation lands.
  const hasExternalFee = isLoadingNetworkFee !== undefined;
  const effectiveIsLoading = hasExternalFee
    ? (isLoadingNetworkFee as boolean)
    : useNetworkFeeReturn.isLoading;

  const disabledSendButton = useMemo(() => {
    if (effectiveIsLoading) {
      return true;
    }

    if (isErrorNetworkFee) {
      return true;
    }

    if (!hasExternalFee && useNetworkFeeReturn.isSimulateError) {
      return true;
    }

    return Number(networkFee?.amount || 0) <= 0;
  }, [
    hasExternalFee,
    isErrorNetworkFee,
    effectiveIsLoading,
    useNetworkFeeReturn.isSimulateError,
    networkFee,
  ]);

  const networkFeeErrorMessage = useMemo(() => {
    if (isErrorNetworkFee) {
      return 'Insufficient network fee';
    }

    return '';
  }, [isErrorNetworkFee]);

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
          tokenName={tokenMetainfo.name}
          chainBadgeImage={chainBadgeImage}
        />

        <TransferSummaryAddress toAddress={toAddress} network={chainName} memo={memo} />
      </div>

      <div className='network-fee-wrapper'>
        <NetworkFee
          value={networkFee?.amount || ''}
          denom={networkFee?.denom || ''}
          isError={isErrorNetworkFee}
          isLoading={effectiveIsLoading}
          errorMessage={networkFeeErrorMessage}
          onClickSetting={onClickNetworkFeeSetting}
        />
      </div>

      {simulateErrorBannerMessage && (
        <div className='simulate-error-banner'>
          <span className='error-label'>ERROR:&nbsp;</span>
          <span className='error-text'>{simulateErrorBannerMessage}</span>
        </div>
      )}

      <div className='bottom-spacer' />

      <BottomFixedButtonGroup
        filled
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
