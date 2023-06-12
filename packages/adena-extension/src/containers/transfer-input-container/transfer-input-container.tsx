import React, { useCallback, useEffect, useState } from 'react';
import TransferInput from '@components/transfer/transfer-input/transfer-input';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { useAddressBookInput } from '@hooks/use-adderss-book-input';
import { useBalanceInput } from '@hooks/use-balance-input';
import { useCurrentAccount } from '@hooks/use-current-account';
import BigNumber from 'bignumber.js';
import { TokenModel, isNativeTokenModel } from '@models/token-model';
import useHistoryData from '@hooks/use-history-data';

interface HistoryData {
  isTokenSearch: boolean;
  tokenMetainfo: TokenModel;
  balanceAmount: string;
  addressInput: {
    selected: boolean;
    selectedAddressBook: {
      id: string;
      name: string;
      address: string;
      createdAt: string;
    } | null;
    address?: string;
  }
}

const TransferInputContainer: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [isTokenSearch, setIsTokenSearch] = useState(state.isTokenSearch === true);
  const [tokenMetainfo, setTokenMetainfo] = useState<TokenModel>(state.tokenBalance);
  const addressBookInput = useAddressBookInput();
  const balanceInput = useBalanceInput(tokenMetainfo);
  const { currentAccount } = useCurrentAccount();
  const { getHistoryData, setHistoryData } = useHistoryData<HistoryData>();

  useEffect(() => {
    setIsTokenSearch(state.isTokenSearch === true);
    setTokenMetainfo(state.tokenBalance);
    addressBookInput.updateAddressBook();
    balanceInput.updateCurrentBalance();
  }, [state, currentAccount]);

  useEffect(() => {
    const historyData = getHistoryData();
    if (historyData) {
      setIsTokenSearch(historyData.isTokenSearch);
      setTokenMetainfo(tokenMetainfo);
      addressBookInput.setSelected(historyData.addressInput.selected);
      if (historyData.addressInput.selectedAddressBook) {
        addressBookInput.setSelectedAddressBook(historyData.addressInput.selectedAddressBook);
      }
      if (historyData.addressInput.address) {
        addressBookInput.setAddress(historyData.addressInput.address);
      }
      balanceInput.onChangeAmount(historyData.balanceAmount);
    }
  }, [getHistoryData()]);

  const saveHistoryData = () => {
    setHistoryData({
      isTokenSearch,
      tokenMetainfo,
      balanceAmount: balanceInput.amount,
      addressInput: {
        selected: addressBookInput.selected,
        selectedAddressBook: addressBookInput.selectedAddressBook,
        address: addressBookInput.address
      }
    });
  }

  const isNext = useCallback(() => {
    if (balanceInput.amount === '' || BigNumber(balanceInput.amount).isLessThanOrEqualTo(0)) {
      return false;
    }
    if (addressBookInput.resultAddress === '') {
      return false;
    }
    return true;
  }, [addressBookInput, balanceInput]);

  const onClickBack = useCallback(() => {
    navigate(-1);
  }, [isTokenSearch]);

  const onClickCancel = useCallback(() => {
    if (isTokenSearch) {
      navigate(RoutePath.Wallet);
      return;
    }
    navigate(-1);
  }, [isTokenSearch]);

  const onClickNext = useCallback(() => {
    if (!isNext()) {
      return;
    }
    const validAddress = addressBookInput.validateAddressBookInput() &&
      (isNativeTokenModel(tokenMetainfo) || addressBookInput.validateEqualAddress());
    const validBalance = balanceInput.validateBalanceInput();
    if (validAddress && validBalance) {
      saveHistoryData();
      navigate(RoutePath.TransferSummary, {
        state: {
          isTokenSearch,
          tokenMetainfo,
          toAddress: addressBookInput.resultAddress,
          transferAmount: {
            value: balanceInput.amount,
            denom: balanceInput.denom
          },
          networkFee: balanceInput.networkFee
        }
      });
    }
  }, [addressBookInput, balanceInput, isNext()]);

  return (
    <TransferInput
      hasBackButton={isTokenSearch}
      tokenMetainfo={tokenMetainfo}
      addressInput={addressBookInput}
      balanceInput={balanceInput}
      isNext={isNext()}
      onClickBack={onClickBack}
      onClickCancel={onClickCancel}
      onClickNext={onClickNext}
    />
  );
};

export default TransferInputContainer;