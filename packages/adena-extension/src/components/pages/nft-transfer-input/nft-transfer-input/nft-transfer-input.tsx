import React, { useMemo } from 'react';

import ArrowLeftIcon from '@assets/arrowL-left.svg';
import { SubHeader } from '@components/atoms';
import { NFTTransferInputWrapper } from './nft-transfer-input.styles';

import { BaseError } from '@common/errors';
import { BottomFixedButtonGroup } from '@components/molecules';
import NFTAssetImageCard from '@components/molecules/nft-asset-image-card/nft-asset-image-card';
import AddressInput from '@components/pages/transfer-input/address-input/address-input';
import MemoInput from '@components/pages/transfer-input/memo-input/memo-input';
import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721Model } from '@types';

export interface NFTTransferInputProps {
  grc721Token: GRC721Model;
  addressInput: {
    opened: boolean;
    hasError: boolean;
    selected: boolean;
    selectedName: string;
    selectedDescription: string;
    address: string;
    errorMessage?: string;
    addressBookInfos: {
      addressBookId: string;
      name: string;
      description: string;
    }[];
    onClickInputIcon: (selected: boolean) => void;
    onChangeAddress: (address: string) => void;
    onClickAddressBook: (addressBookId: string) => void;
  };
  memoInput: {
    memo: string;
    memoError?: BaseError | null;
    onChangeMemo: (memo: string) => void;
  };
  isNext: boolean;
  hasBackButton: boolean;
  queryGRC721TokenUri: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<string | null, Error>,
  ) => UseQueryResult<string | null>;
  onClickBack: () => void;
  onClickCancel: () => void;
  onClickNext: () => void;
}

const NFTTransferInput: React.FC<NFTTransferInputProps> = ({
  grc721Token,
  addressInput,
  memoInput,
  hasBackButton,
  isNext,
  queryGRC721TokenUri,
  onClickBack,
  onClickCancel,
  onClickNext,
}) => {
  const title = useMemo(() => {
    return `Send ${grc721Token.name} #${grc721Token.tokenId}`;
  }, [grc721Token]);

  return (
    <NFTTransferInputWrapper>
      {hasBackButton ? (
        <SubHeader
          title={title}
          leftElement={{
            element: <img src={`${ArrowLeftIcon}`} alt={'back image'} />,
            onClick: onClickBack,
          }}
        />
      ) : (
        <SubHeader title={title} />
      )}
      <div className='asset-card-wrapper'>
        <NFTAssetImageCard asset={grc721Token} queryGRC721TokenUri={queryGRC721TokenUri} />
      </div>

      <div className='address-input-wrapper'>
        <AddressInput {...addressInput} />
      </div>
      <div className='memo-input-wrapper'>
        <MemoInput {...memoInput} />
      </div>

      <BottomFixedButtonGroup
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel,
        }}
        rightButton={{
          text: 'Next',
          onClick: onClickNext,
          disabled: !isNext,
          primary: true,
        }}
        filled
      />
    </NFTTransferInputWrapper>
  );
};

export default NFTTransferInput;
