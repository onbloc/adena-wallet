import React from 'react';

import ArrowLeftIcon from '@assets/arrowL-left.svg';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import IconLink from '@assets/icon-link';
import { SubHeader } from '@components/atoms';
import { ChainDropdown, ChainOption } from '@components/atoms/chain-dropdown';
import AddressInput from '../address-input/address-input';
import BalanceInput from '../balance-input/balance-input';
import TransferModeTabs, {
  TransferMode,
} from '../transfer-mode-tabs/transfer-mode-tabs';
import { TransferInputWrapper } from './transfer-input.styles';

import { BaseError } from '@common/errors';
import { BottomFixedButtonGroup } from '@components/molecules';
import { TokenModel } from '@types';
import MemoInput from '../memo-input/memo-input';

const IBC_WARNING_TEXT = 'Do not use your centralized exchange address for IBC transfers.';

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
    memoError?: BaseError | null;
    onChangeMemo: (memo: string) => void;
  };
  transferMode: TransferMode;
  onChangeMode: (mode: TransferMode) => void;
  ibcChainInput: {
    chainGroup: string;
    chainName: string;
    chainOptions: ChainOption[];
    onChangeChain: (chainGroup: string) => void;
  };
  onClickBridgeGuide: () => void;
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
  transferMode,
  onChangeMode,
  ibcChainInput,
  onClickBridgeGuide,
  hasBackButton,
  isNext,
  onClickBack,
  onClickCancel,
  onClickNext,
}) => {
  const isIbc = transferMode === 'ibc';
  const isCosmosNative = tokenMetainfo?.type === 'cosmos-native';
  const addressPlaceholder = isIbc
    ? `Recipient’s ${ibcChainInput.chainName} Address`
    : isCosmosNative
      ? 'Recipient’s AtomOne Address'
      : 'Recipient’s Gno.land Address';
  const addressMaxLength = isIbc || isCosmosNative ? 48 : 40;

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

      <div className='mode-tabs-wrapper'>
        <TransferModeTabs value={transferMode} onChange={onChangeMode} />
      </div>

      {isIbc && (
        <div className='receiving-chain-wrapper'>
          <ChainDropdown
            placeholder='Receiving Chain:'
            value={ibcChainInput.chainGroup}
            onChange={ibcChainInput.onChangeChain}
            options={ibcChainInput.chainOptions}
          />
        </div>
      )}

      <div className='address-input-wrapper'>
        <AddressInput
          {...addressInput}
          maxLength={addressMaxLength}
          placeholder={addressPlaceholder}
        />
      </div>
      <div className='balance-input-wrapper'>
        <BalanceInput {...balanceInput} />
      </div>
      <div className='memo-input-wrapper'>
        <MemoInput {...memoInput} warningText={isIbc ? IBC_WARNING_TEXT : undefined} />
      </div>

      {isIbc && (
        <button type='button' className='bridge-guide-link' onClick={onClickBridgeGuide}>
          <span className='label'>How does bridging work?</span>
          <IconLink />
        </button>
      )}

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
