import React, { useCallback, useEffect, useState } from 'react';
import TransferInput from '@components/transfer/transfer-input/transfer-input';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { TokenMetainfo } from '@states/token';
import { useAddressBookInput } from '@hooks/use-adderss-book-input';
import { useBalanceInput } from '@hooks/use-balance-input';
import { useCurrentAccount } from '@hooks/use-current-account';

const TransferInputContainer: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [tokenMetainfo, setTokenMetainfo] = useState<TokenMetainfo>(state);
  const addressBookInput = useAddressBookInput();
  const balanceInput = useBalanceInput(tokenMetainfo);
  const { currentAccount } = useCurrentAccount();

  useEffect(() => {
    setTokenMetainfo(tokenMetainfo);
    addressBookInput.updateAddressBook();
    balanceInput.updateCurrentBalance();
  }, [state, currentAccount]);

  const onClickCancel = useCallback(() => {
    navigate(-1);
  }, []);

  const onClickNext = useCallback(() => {
    const validAddress = addressBookInput.validateAddressBookInput();
    const validBalance = balanceInput.validateBalanceInput();
    if (validAddress && validBalance) {
      navigate(RoutePath.TransferSummary, {
        state: {
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
  }, [addressBookInput, balanceInput]);

  return (
    <TransferInput
      tokenMetainfo={tokenMetainfo}
      addressInput={addressBookInput}
      balanceInput={balanceInput}
      isNext={true}
      onClickCancel={onClickCancel}
      onClickNext={onClickNext}
    />
  );
};

export default TransferInputContainer;