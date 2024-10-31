import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAddressBookInput } from '@hooks/use-address-book-input';
import { useCurrentAccount } from '@hooks/use-current-account';
import useHistoryData from '@hooks/use-history-data';
import { GRC721Model, RoutePath } from '@types';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import { DEFAULT_NETWORK_FEE } from '@common/constants/tx.constant';
import { TransactionValidationError } from '@common/errors/validation/transaction-validation-error';
import { calculateByteSize } from '@common/utils/string-utils';
import NFTTransferInput from '@components/pages/nft-transfer-input/nft-transfer-input/nft-transfer-input';
import { useGetGRC721TokenUri } from '@hooks/nft/use-get-grc721-token-uri';
import useAppNavigate from '@hooks/use-app-navigate';
import { useNetwork } from '@hooks/use-network';
import { useTransferInfo } from '@hooks/use-transfer-info';

interface HistoryData {
  grc721Token: GRC721Model;
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

const MEMO_MAX_BYTES = 65_536; // 2 ** 16

const NFTTransferInputContainer: React.FC = () => {
  const { params, navigate, goBack } = useAppNavigate<RoutePath.NftTransferInput>();
  const grc721Token = params.collectionAsset;

  const addressBookInput = useAddressBookInput();
  const { currentAccount } = useCurrentAccount();
  const { getHistoryData, setHistoryData } = useHistoryData<HistoryData>();
  const { currentNetwork } = useNetwork();
  const { memorizedTransferInfo, clear: clearMemorizedTransferInfo } = useTransferInfo();
  const [memo, setMemo] = useState(memorizedTransferInfo?.memo || '');

  const memoError = useMemo(() => {
    const size = calculateByteSize(memo);
    if (size < MEMO_MAX_BYTES) {
      return null;
    }

    return new TransactionValidationError('MEMO_TOO_LARGE_ERROR');
  }, [memo]);

  const onChangeMemo = useCallback((memo: string) => {
    setMemo(memo);
  }, []);

  const saveHistoryData = (): void => {
    if (!grc721Token) {
      return;
    }
    setHistoryData({
      grc721Token,
      addressInput: {
        selected: addressBookInput.selected,
        selectedAddressBook: addressBookInput.selectedAddressBook,
        address: addressBookInput.address,
      },
    });
  };

  const isNext = useMemo(() => {
    if (addressBookInput.resultAddress === '') {
      return false;
    }
    if (memoError !== null) {
      return false;
    }
    return true;
  }, [addressBookInput, memoError]);

  const onClickCancel = useCallback(() => {
    goBack();
  }, []);

  const onClickNext = useCallback(async () => {
    if (!isNext) {
      return;
    }
    if (!grc721Token) {
      return;
    }
    const validAddress =
      addressBookInput.validateAddressBookInput() &&
      (await addressBookInput.validateEqualAddress());

    if (validAddress) {
      saveHistoryData();
      navigate(RoutePath.NftTransferSummary, {
        state: {
          grc721Token,
          toAddress: addressBookInput.resultAddress,
          networkFee: {
            value: DEFAULT_NETWORK_FEE.toString(),
            denom: GNOT_TOKEN.denom,
          },
          memo,
        },
      });
    }
  }, [addressBookInput, isNext]);

  useEffect(() => {
    if (currentAccount) {
      addressBookInput.updateAddressBook();
      clearMemorizedTransferInfo();
    }
  }, [currentAccount, currentNetwork.chainId]);

  useEffect(() => {
    const historyData = getHistoryData();
    if (historyData) {
      addressBookInput.setSelected(historyData.addressInput.selected);
      if (historyData.addressInput.selectedAddressBook) {
        addressBookInput.setSelectedAddressBook(historyData.addressInput.selectedAddressBook);
      }
      if (historyData.addressInput.address) {
        addressBookInput.setAddress(historyData.addressInput.address);
      }
    }
  }, [getHistoryData()]);

  return (
    <NFTTransferInput
      grc721Token={grc721Token}
      addressInput={addressBookInput}
      queryGRC721TokenUri={useGetGRC721TokenUri}
      memoInput={{ memo, onChangeMemo, memoError }}
      isNext={isNext}
      onClickBack={goBack}
      onClickCancel={onClickCancel}
      onClickNext={onClickNext}
      hasBackButton
    />
  );
};

export default NFTTransferInputContainer;
