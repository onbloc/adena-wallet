import React from 'react';

import ArrowLeftIcon from '@assets/arrowL-left.svg';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import { SubHeader } from '@components/atoms';
import AddressInput from '../address-input/address-input';
import BalanceInput from '../balance-input/balance-input';
import { TransferInputWrapper } from './transfer-input.styles';

import { BottomFixedButtonGroup } from '@components/molecules';
import { TokenModel } from '@types';
import MemoInput from '../memo-input/memo-input';

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
  memoInput: {
    memo: string;
    onChangeMemo: (memo: string) => void;
  };
  isNext: boolean;
  hasBackButton: boolean;
  onClickBack: () => void;
  onClickCancel: () => void;
  onClickNext: () => void;
}

const TransferInput: React.FC<TransferInputProps> = ({
  tokenMetainfo,
  addressInput,
  balanceInput,
  memoInput,
  hasBackButton,
  isNext,
  onClickBack,
  onClickCancel,
  onClickNext,
}) => {
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
    </TransferInputWrapper>
  );
};

export default TransferInput;
