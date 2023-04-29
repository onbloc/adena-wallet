import React from 'react';
import { TransferInputWrapper } from './transfer-input.styles';
import { TokenMetainfo } from '@states/token';
import SubHeader from '@components/common/sub-header/sub-header';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import AddressInput from '../address-input/address-input';
import BalanceInput from '../balance-input/balance-input';

export interface TransferInputProps {
  tokenMetainfo: TokenMetainfo;
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
  isNext: boolean;
  onClickCancel: () => void;
  onClickNext: () => void;
}

const TransferInput: React.FC<TransferInputProps> = ({
  tokenMetainfo,
  addressInput,
  balanceInput,
  isNext,
  onClickCancel,
  onClickNext
}) => {
  return (
    <TransferInputWrapper>
      <SubHeader
        title={`Send ${tokenMetainfo.symbol}`}
      />
      <div className='logo-wrapper'>
        <img className='logo' src={tokenMetainfo.image ?? UnknownTokenIcon} alt='token image' />
      </div>
      <div className='address-input-wrapper'>
        <AddressInput {...addressInput} />
      </div>
      <div className='balance-input-wrapper'>
        <BalanceInput {...balanceInput} />
      </div>
      <div className='button-group'>
        <button onClick={onClickCancel}>Cancel</button>
        <button className={isNext ? 'next' : 'next disabled'} onClick={onClickNext}>Next</button>
      </div>
    </TransferInputWrapper>
  );
};

export default TransferInput;