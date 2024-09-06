import React, { useCallback, useEffect, useState } from 'react';
import BigNumber from 'bignumber.js';
import styled from 'styled-components';

import TransferInput from '@components/pages/transfer-input/transfer-input/transfer-input';
import { RoutePath } from '@types';
import { useAddressBookInput } from '@hooks/use-address-book-input';
import { useBalanceInput } from '@hooks/use-balance-input';
import { useCurrentAccount } from '@hooks/use-current-account';
import { isNativeTokenModel } from '@common/validation/validation-token';
import useHistoryData from '@hooks/use-history-data';

import { TokenModel } from '@types';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';
import { useNetwork } from '@hooks/use-network';
import useSessionParams from '@hooks/use-session-state';

const TransferInputLayoutWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: 100%;
  padding: 24px 20px;
`;

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
  };
}

const TransferInputContainer: React.FC = () => {
  const { navigate, goBack } = useAppNavigate<RoutePath.TransferInput>();
  const {
    isPopup,
    params,
    isLoading: isLoadingSessionState,
  } = useSessionParams<RoutePath.TransferInput>();
  const [isTokenSearch, setIsTokenSearch] = useState(params?.isTokenSearch === true);
  const [tokenMetainfo, setTokenMetainfo] = useState<TokenModel | undefined>(params?.tokenBalance);
  const addressBookInput = useAddressBookInput();
  const balanceInput = useBalanceInput(tokenMetainfo);
  const { currentAccount } = useCurrentAccount();
  const { getHistoryData, setHistoryData } = useHistoryData<HistoryData>();
  const { currentNetwork } = useNetwork();

  useEffect(() => {
    if (isLoadingSessionState) {
      return;
    }
    if (params) {
      setIsTokenSearch(params.isTokenSearch === true);
      setTokenMetainfo(params.tokenBalance);
    }
  }, [isPopup, params, isLoadingSessionState]);

  useEffect(() => {
    if (currentAccount && tokenMetainfo) {
      addressBookInput.updateAddressBook();
      balanceInput.updateCurrentBalance();
    }
  }, [currentAccount, tokenMetainfo, currentNetwork.chainId]);

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

  const saveHistoryData = (): void => {
    if (!tokenMetainfo) {
      return;
    }
    setHistoryData({
      isTokenSearch,
      tokenMetainfo,
      balanceAmount: balanceInput.amount,
      addressInput: {
        selected: addressBookInput.selected,
        selectedAddressBook: addressBookInput.selectedAddressBook,
        address: addressBookInput.address,
      },
    });
  };

  const isNext = useCallback(async () => {
    if (balanceInput.amount === '' || BigNumber(balanceInput.amount).isLessThanOrEqualTo(0)) {
      return false;
    }
    if (await addressBookInput.resultAddress === '') {
      return false;
    }
    return true;
  }, [addressBookInput, balanceInput]);

  const onClickCancel = useCallback(() => {
    if (isTokenSearch) {
      navigate(RoutePath.Wallet);
      return;
    }
    goBack();
  }, [isTokenSearch]);

  const onClickNext = useCallback(async () => {
    if (!isNext()) {
      return;
    }
    if (!tokenMetainfo) {
      return;
    }
    const validAddress =
      await addressBookInput.validateAddressBookInput() &&
      (isNativeTokenModel(tokenMetainfo) || (await addressBookInput.validateEqualAddress()));
    const validBalance = balanceInput.validateBalanceInput();
    if (validAddress && validBalance) {
      saveHistoryData();
      navigate(RoutePath.TransferSummary, {
        state: {
          isTokenSearch,
          tokenMetainfo,
          toAddress: await addressBookInput.resultAddress,
          transferAmount: {
            value: balanceInput.amount,
            denom: balanceInput.denom,
          },
          networkFee: balanceInput.networkFee,
        },
      });
    }
  }, [addressBookInput, balanceInput, isNext()]);

  if (isLoadingSessionState) {
    return <></>;
  }

  return (
    <TransferInputLayoutWrapper>
      <TransferInput
        hasBackButton={isTokenSearch}
        tokenMetainfo={tokenMetainfo}
        addressInput={addressBookInput}
        balanceInput={balanceInput}
        isNext={isNext()}
        onClickBack={goBack}
        onClickCancel={onClickCancel}
        onClickNext={onClickNext}
      />
    </TransferInputLayoutWrapper>
  );
};

export default TransferInputContainer;
