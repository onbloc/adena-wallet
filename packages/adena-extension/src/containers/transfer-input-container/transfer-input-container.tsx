import React, { useCallback, useEffect, useState } from 'react';
import TransferInput from '@components/transfer/transfer-input/transfer-input';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { TokenMetainfo } from '@states/token';
import { useAddressBookInput } from '@hooks/use-adderss-book-input';
import { useBalanceInput } from '@hooks/use-balance-input';
import { useCurrentAccount } from '@hooks/use-current-account';
import BigNumber from 'bignumber.js';

const TransferInputContainer: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [isTokenSearch, setIsTokenSearch] = useState(state.isTokenSearch === true);
  const [tokenMetainfo, setTokenMetainfo] = useState<TokenMetainfo>(state.tokenBalance);
  const addressBookInput = useAddressBookInput();
  const balanceInput = useBalanceInput(tokenMetainfo);
  const { currentAccount } = useCurrentAccount();

  useEffect(() => {
    setIsTokenSearch(state.isTokenSearch === true);
    setTokenMetainfo(state.tokenBalance);
    addressBookInput.updateAddressBook();
    balanceInput.updateCurrentBalance();
  }, [state, currentAccount]);

  const isNext = useCallback(() => {
    if (balanceInput.amount === '' || BigNumber(balanceInput.amount).isLessThanOrEqualTo(0)) {
      return false;
    }
    if (addressBookInput.resultAddress === '') {
      return false;
    }
    return true;
  }, [addressBookInput, balanceInput]);

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
    const validAddress = addressBookInput.validateAddressBookInput();
    const validBalance = balanceInput.validateBalanceInput();
    if (validAddress && validBalance) {
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
      tokenMetainfo={tokenMetainfo}
      addressInput={addressBookInput}
      balanceInput={balanceInput}
      isNext={isNext()}
      onClickCancel={onClickCancel}
      onClickNext={onClickNext}
    />
  );
};

export default TransferInputContainer;