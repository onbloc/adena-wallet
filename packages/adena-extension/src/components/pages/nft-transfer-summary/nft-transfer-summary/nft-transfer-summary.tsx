import React, { useMemo } from 'react';

import { SubHeader } from '@components/atoms';

import ArrowLeftIcon from '@assets/arrowL-left.svg';
import ArrowDownIcon from '@assets/transfer-arrow-down.svg';
import { NFTTransferSummaryWrapper } from './nft-transfer-summary.styles';

import { TransactionValidationError } from '@common/errors/validation/transaction-validation-error';
import { BottomFixedButtonGroup } from '@components/molecules';
import NFTAssetImageCard from '@components/molecules/nft-asset-image-card/nft-asset-image-card';
import TransferSummaryAddress from '@components/pages/transfer-summary/transfer-summary-address/transfer-summary-address';
import TransferSummaryNetworkFee from '@components/pages/transfer-summary/transfer-summary-network-fee/transfer-summary-network-fee';
import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721Model } from '@types';

export interface NFTTransferSummaryProps {
  grc721Token: GRC721Model;
  toAddress: string;
  networkFee: {
    value: string;
    denom: string;
  };
  memo: string;
  isErrorNetworkFee?: boolean;
  queryGRC721TokenUri: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<string | null, Error>,
  ) => UseQueryResult<string | null>;
  onClickBack: () => void;
  onClickCancel: () => void;
  onClickSend: () => void;
}

const NFTTransferSummary: React.FC<NFTTransferSummaryProps> = ({
  grc721Token,
  toAddress,
  networkFee,
  memo,
  isErrorNetworkFee,
  queryGRC721TokenUri,
  onClickBack,
  onClickCancel,
  onClickSend,
}) => {
  const insufficientNetworkFeeError = new TransactionValidationError('INSUFFICIENT_NETWORK_FEE');

  const title = useMemo(() => {
    return `Sending ${grc721Token.name} #${grc721Token.tokenId}`;
  }, [grc721Token]);

  const errorMessage = useMemo(() => {
    if (!isErrorNetworkFee) {
      return '';
    }

    return insufficientNetworkFeeError.message;
  }, [isErrorNetworkFee]);

  return (
    <NFTTransferSummaryWrapper>
      <div className='sub-header-wrapper'>
        <SubHeader
          leftElement={{
            element: <img src={`${ArrowLeftIcon}`} alt={'back image'} />,
            onClick: onClickBack,
          }}
          title={title}
        />
      </div>

      <div className='info-wrapper'>
        <div className='asset-card-wrapper'>
          <NFTAssetImageCard asset={grc721Token} queryGRC721TokenUri={queryGRC721TokenUri} />
        </div>

        <div className='direction-icon-wrapper'>
          <img src={`${ArrowDownIcon}`} alt='direction-icon' />
        </div>

        <TransferSummaryAddress toAddress={toAddress} memo={memo} />
      </div>

      <div className='network-fee-wrapper'>
        <TransferSummaryNetworkFee
          isError={isErrorNetworkFee}
          value={networkFee.value}
          denom={networkFee.denom}
        />
        {isErrorNetworkFee && <span className='error-message'>{errorMessage}</span>}
      </div>

      <BottomFixedButtonGroup
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel,
        }}
        rightButton={{
          text: 'Send',
          onClick: onClickSend,
          primary: true,
        }}
        filled
      />
    </NFTTransferSummaryWrapper>
  );
};

export default NFTTransferSummary;
