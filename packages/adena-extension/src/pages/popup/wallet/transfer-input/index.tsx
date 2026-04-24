import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { isNativeTokenModel } from '@common/validation/validation-token';
import { CHAIN_DISPLAY_NAME } from '@components/atoms/chain-dropdown';
import TransferInput from '@components/pages/transfer-input/transfer-input/transfer-input';
import { TransferMode } from '@components/pages/transfer-input/transfer-mode-tabs/transfer-mode-tabs';
import { useAddressBookInput } from '@hooks/use-address-book-input';
import { useBalanceInput } from '@hooks/use-balance-input';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useHistoryData from '@hooks/use-history-data';
import useLink from '@hooks/use-link';
import { RoutePath } from '@types';

import { TransactionValidationError } from '@common/errors/validation/transaction-validation-error';
import { calculateByteSize } from '@common/utils/string-utils';
import useAppNavigate from '@hooks/use-app-navigate';
import { useNetwork } from '@hooks/use-network';
import useSessionParams from '@hooks/use-session-state';
import { useTransferInfo } from '@hooks/use-transfer-info';
import { TokenModel } from '@types';

// TODO(ADN-760 follow-up): replace with the finalized bridging guide URL.
const BRIDGE_GUIDE_URL = '#';

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

const MEMO_MAX_BYTES = 65_536; // 2 ** 16

const TransferInputContainer: React.FC = () => {
  const { navigate, goBack } = useAppNavigate<RoutePath.TransferInput>();
  const {
    isPopup,
    params,
    isLoading: isLoadingSessionState,
  } = useSessionParams<RoutePath.TransferInput>();
  const [isTokenSearch, setIsTokenSearch] = useState(params?.isTokenSearch === true);
  const [tokenMetainfo, setTokenMetainfo] = useState<TokenModel | undefined>(params?.tokenBalance);
  const { chainRegistry } = useAdenaContext();
  const tokenChainGroup = useMemo(() => {
    if (!tokenMetainfo) return 'gno';
    return chainRegistry.getChainByChainId(tokenMetainfo.networkId)?.chainGroup ?? 'gno';
  }, [tokenMetainfo, chainRegistry]);
  const addressBookInput = useAddressBookInput(tokenChainGroup);
  const balanceInput = useBalanceInput(tokenMetainfo);
  const { currentAccount } = useCurrentAccount();
  const { getHistoryData, setHistoryData } = useHistoryData<HistoryData>();
  const { currentNetwork } = useNetwork();
  const { memorizedTransferInfo, clear: clearMemorizedTransferInfo } = useTransferInfo();
  const [memo, setMemo] = useState(memorizedTransferInfo?.memo || '');
  const { openLink } = useLink();

  const [transferMode, setTransferMode] = useState<TransferMode>('send');

  const defaultReceivingChainGroup = useMemo(() => {
    return chainRegistry.list()[0]?.chainGroup ?? 'atomone';
  }, [chainRegistry]);

  const [receivingChainGroup, setReceivingChainGroup] =
    useState<string>(defaultReceivingChainGroup);

  const receivingChainName = useMemo(() => {
    return (
      CHAIN_DISPLAY_NAME[receivingChainGroup] ??
      chainRegistry.getDefault(receivingChainGroup)?.displayName ??
      receivingChainGroup
    );
  }, [receivingChainGroup, chainRegistry]);

  const onChangeMode = useCallback((mode: TransferMode) => {
    setTransferMode(mode);
  }, []);

  const onChangeReceivingChain = useCallback((chainGroup: string) => {
    setReceivingChainGroup(chainGroup);
  }, []);

  const onClickBridgeGuide = useCallback(() => {
    openLink(BRIDGE_GUIDE_URL);
  }, [openLink]);

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

  const isNext = useMemo(() => {
    // TODO(ADN-760 follow-up): enable Next for IBC mode once MsgTransfer
    // path lands (see plans/cosmos-support/phase-10-bonus-ibc.md).
    if (transferMode === 'ibc') {
      return false;
    }
    if (balanceInput.amount === '' || BigNumber(balanceInput.amount).isLessThanOrEqualTo(0)) {
      return false;
    }
    if (addressBookInput.resultAddress === '') {
      return false;
    }
    if (memoError !== null) {
      return false;
    }
    return true;
  }, [addressBookInput, balanceInput, memoError, transferMode]);

  const onClickCancel = useCallback(() => {
    if (isTokenSearch) {
      navigate(RoutePath.Wallet);
      return;
    }
    goBack();
  }, [isTokenSearch]);

  const onClickNext = useCallback(async () => {
    if (!isNext) {
      return;
    }
    if (transferMode === 'ibc') {
      // TODO(ADN-760 follow-up): wire IBC MsgTransfer path here.
      return;
    }
    if (!tokenMetainfo) {
      return;
    }
    const validAddress =
      addressBookInput.validateAddressBookInput() &&
      (isNativeTokenModel(tokenMetainfo) || (await addressBookInput.validateEqualAddress()));
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
            denom: balanceInput.denom,
          },
          gasInfo: balanceInput.gasInfo,
          memo,
        },
      });
    }
  }, [addressBookInput, balanceInput, isNext, transferMode]);

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
      clearMemorizedTransferInfo();
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

  if (isLoadingSessionState) {
    return <></>;
  }

  return (
    <TransferInput
      hasBackButton={isTokenSearch}
      tokenMetainfo={tokenMetainfo}
      addressInput={addressBookInput}
      balanceInput={balanceInput}
      memoInput={{ memo, onChangeMemo, memoError }}
      transferMode={transferMode}
      onChangeMode={onChangeMode}
      ibcChainInput={{
        chainGroup: receivingChainGroup,
        chainName: receivingChainName,
        onChangeChain: onChangeReceivingChain,
      }}
      onClickBridgeGuide={onClickBridgeGuide}
      isNext={isNext}
      onClickBack={goBack}
      onClickCancel={onClickCancel}
      onClickNext={onClickNext}
    />
  );
};

export default TransferInputContainer;
