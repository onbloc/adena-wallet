import React, { useEffect, useState } from 'react';

import { SubHeader } from '@components/atoms';
import { TransferInputWrapper } from './transfer-input.styles';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import AddressInput from '../address-input/address-input';
import BalanceInput from '../balance-input/balance-input';
import ArrowLeftIcon from '@assets/arrowL-left.svg';

import { TokenModel } from '@types';

export interface TransferInputProps {
  tokenMetainfo?: TokenModel;
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
  balanceInput: {
    hasError: boolean;
    amount: string;
    denom: string;
    description: string;
    onChangeAmount: (value: string) => void;
    onClickMax: () => void;
  };
  isNext: Promise<boolean>;
  hasBackButton: boolean;
  onClickBack: () => void;
  onClickCancel: () => void;
  onClickNext: () => void;
}

const TransferInput: React.FC<TransferInputProps> = ({
  tokenMetainfo,
  addressInput,
  balanceInput,
  hasBackButton,
  isNext,
  onClickBack,
  onClickCancel,
  onClickNext,
}) => {

  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    const checkNext = async () => {
      const result = await isNext;
      setCanNext(result);
    };
    checkNext();
  }, [isNext]);

  return (
    <TransferInputWrapper>
      {hasBackButton ? (
        <SubHeader
          title={`Send ${tokenMetainfo?.symbol || ''}`}
          leftElement={{
            element: <img src={`${ArrowLeftIcon}`} alt={'back image'} />,
            onClick: onClickBack,
          }}
        />
      ) : (
        <SubHeader title={`Send ${tokenMetainfo?.symbol || ''}`} />
      )}
      <div className='logo-wrapper'>
        <img className='logo' src={tokenMetainfo?.image || UnknownTokenIcon} alt='token image' />
      </div>
      <div className='address-input-wrapper'>
        <AddressInput {...addressInput} />
      </div>
      <div className='balance-input-wrapper'>
        <BalanceInput {...balanceInput} />
      </div>
      <div className='button-group'>
        <button onClick={onClickCancel}>Cancel</button>
        <button className={canNext ? 'next' : 'next disabled'} onClick={onClickNext}>
          Next
        </button>
      </div>
    </TransferInputWrapper>
  );
};

export default TransferInput;
