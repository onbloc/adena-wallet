import { Document, isLedgerAccount } from 'adena-module';
import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import { GasToken } from '@common/constants/token.constant';
import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import NetworkFeeSetting from '@components/pages/network-fee-setting/network-fee-setting/network-fee-setting';
import TransferSummary from '@components/pages/transfer-summary/transfer-summary/transfer-summary';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useTransferInfo } from '@hooks/use-transfer-info';
import { useGetGnotBalance } from '@hooks/wallet/use-get-gnot-balance';
import { useNetworkFee } from '@hooks/wallet/use-network-fee';
import { createNotificationSendMessage } from '@inject/message/methods/transaction-event';
import { TransactionMessage } from '@services/index';
import mixins from '@styles/mixins';
import { RoutePath } from '@types';

const TransferSummaryLayout = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: 100%;
  padding: 24px 20px;
`;

const TransferSummaryContainer: React.FC = () => {
  const normalNavigate = useNavigate();
  const { navigate, goBack, params } = useAppNavigate<RoutePath.TransferSummary>();
  const summaryInfo = params;
  const { wallet } = useWalletContext();
  const { transactionService } = useAdenaContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const { setMemorizedTransferInfo } = useTransferInfo();
  const [isSent, setIsSent] = useState(false);
  const [openedNetworkFeeSetting, setOpenedNetworkFeeSetting] = useState(false);
  const [document, setDocument] = useState<Document | null>(null);

  const useNetworkFeeReturn = useNetworkFee(document, false);
  const networkFee = useNetworkFeeReturn.networkFee;

  const { data: currentBalance } = useGetGnotBalance();

  const hasNetworkFee = useMemo(() => {
    if (!currentBalance || currentBalance === 0) {
      return false;
    }

    if (!networkFee || !Number(networkFee.amount)) {
      return false;
    }

    let leastUsedAmount = BigNumber(networkFee.amount);

    if (summaryInfo.tokenMetainfo.type === 'gno-native') {
      leastUsedAmount = leastUsedAmount.plus(BigNumber(summaryInfo.transferAmount.value));
    }

    const currentBalanceAmount = BigNumber(currentBalance).shiftedBy(GasToken.decimals * -1);
    if (currentBalanceAmount.isLessThan(leastUsedAmount)) {
      return false;
    }

    return true;
  }, [currentBalance, networkFee?.amount, summaryInfo]);

  const isNetworkFeeError = useMemo(() => {
    if (useNetworkFeeReturn.isLoading) {
      return false;
    }

    if (currentBalance === null || currentBalance === undefined) {
      return false;
    }

    if (currentBalance === 0) {
      return true;
    }

    return !hasNetworkFee;
  }, [currentBalance, networkFee?.amount, useNetworkFeeReturn.isLoading, hasNetworkFee]);

  const getTransferBalance = useCallback(() => {
    const { value, denom } = summaryInfo.transferAmount;

    return {
      value: `${BigNumber(value).toFormat()}`,
      denom,
    };
  }, [summaryInfo]);

  const getNativeTransferMessage = useCallback(() => {
    const { tokenMetainfo, toAddress, transferAmount } = summaryInfo;

    if (!isNativeTokenModel(tokenMetainfo)) {
      return;
    }

    const sendAmount = `${BigNumber(transferAmount.value).shiftedBy(tokenMetainfo.decimals)}${
      tokenMetainfo.denom
    }`;

    return TransactionMessage.createMessageOfBankSend({
      fromAddress: currentAddress || '',
      toAddress,
      amount: sendAmount,
    });
  }, [summaryInfo, currentAddress]);

  const getGRC20TransferMessage = useCallback(() => {
    const { tokenMetainfo, toAddress, transferAmount } = summaryInfo;

    if (!isGRC20TokenModel(tokenMetainfo)) {
      return;
    }

    return TransactionMessage.createMessageOfVmCall({
      caller: currentAddress || '',
      send: '',
      pkgPath: tokenMetainfo.pkgPath,
      func: 'Transfer',
      args: [
        toAddress,
        `${Math.round(BigNumber(transferAmount.value).shiftedBy(tokenMetainfo.decimals).toNumber())}`,
      ],
    });
  }, [summaryInfo, currentAddress]);

  const createDocument = async (): Promise<Document | null> => {
    if (!currentNetwork || !currentAccount || !currentAddress) {
      return null;
    }

    const { tokenMetainfo, memo } = summaryInfo;
    const gasWanted = useNetworkFeeReturn.currentGasInfo?.gasWanted || 0;
    const message =
      tokenMetainfo.type === 'gno-native' ? getNativeTransferMessage() : getGRC20TransferMessage();

    const document = await transactionService.createDocument(
      currentAccount,
      currentNetwork.networkId,
      [message],
      gasWanted,
      BigNumber(networkFee?.amount || 0)
        .shiftedBy(GasToken.decimals)
        .toNumber(),
      memo,
    );

    return document;
  };

  const updateDocument = (): void => {
    if (!document) {
      return;
    }

    const memo = summaryInfo.memo;
    const gasFee = useNetworkFeeReturn.currentGasFeeRawAmount;

    setDocument({
      ...document,
      memo,
      fee: {
        amount: [
          {
            denom: GasToken.denom,
            amount: gasFee.toString(),
          },
        ],
        gas: useNetworkFeeReturn.currentGasInfo?.gasWanted.toString() || '0',
      },
    });
  };

  const createTransaction = useCallback(async () => {
    if (!currentNetwork || !currentAccount || !wallet) {
      return null;
    }

    const document = await createDocument();
    if (!document) {
      return null;
    }

    const walletInstance = wallet.clone();
    walletInstance.currentAccountId = currentAccount.id;

    const { signed } = await transactionService.createTransaction(walletInstance, document);

    return transactionService.sendTransaction(walletInstance, currentAccount, signed).catch((e) => {
      console.error(e);
      return null;
    });
  }, [
    summaryInfo,
    currentAccount,
    currentNetwork,
    networkFee,
    useNetworkFeeReturn.currentGasFeeRawAmount,
    useNetworkFeeReturn.currentGasInfo,
  ]);

  const transfer = async (): Promise<boolean> => {
    if (isSent || !currentAccount || !hasNetworkFee || useNetworkFeeReturn.isLoading) {
      return false;
    }

    setIsSent(true);
    if (isLedgerAccount(currentAccount)) {
      return transferByLedger();
    }

    return transferByCommon();
  };

  const transferByCommon = useCallback(async () => {
    try {
      createTransaction().then(createNotificationSendMessage);
      navigate(RoutePath.History);
    } catch (e) {
      if (!(e instanceof Error)) {
        return false;
      }
    }

    setIsSent(false);
    return false;
  }, [createTransaction]);

  const transferByLedger = useCallback(async () => {
    const document = await createDocument();
    if (document) {
      navigate(RoutePath.TransferLedgerLoading, { state: { document } });
    }
    return true;
  }, [createDocument]);

  const onClickBack = useCallback(() => {
    setMemorizedTransferInfo(summaryInfo);
    goBack();
  }, [summaryInfo]);

  const onClickCancel = useCallback(() => {
    if (summaryInfo.isTokenSearch === true) {
      navigate(RoutePath.Wallet);
      return;
    }
    normalNavigate(-2);
  }, [summaryInfo, navigate]);

  const onClickNetworkFeeSetting = useCallback(() => {
    setOpenedNetworkFeeSetting(true);
  }, []);

  const onClickNetworkFeeClose = useCallback(() => {
    setOpenedNetworkFeeSetting(false);
  }, []);

  const onClickNetworkFeeSave = useCallback(() => {
    useNetworkFeeReturn.save();
    setOpenedNetworkFeeSetting(false);
  }, [useNetworkFeeReturn.save]);

  useEffect(() => {
    if (!document) {
      createDocument().then((doc) => {
        if (!doc) {
          return;
        }

        setDocument(doc);
      });
    } else {
      updateDocument();
    }
  }, [
    wallet,
    summaryInfo,
    currentAccount,
    currentNetwork,
    useNetworkFeeReturn.currentGasFeeRawAmount,
  ]);

  return (
    <TransferSummaryLayout>
      {openedNetworkFeeSetting ? (
        <NetworkFeeSetting
          {...useNetworkFeeReturn}
          onClickBack={onClickNetworkFeeClose}
          onClickSave={onClickNetworkFeeSave}
        />
      ) : (
        <TransferSummary
          tokenMetainfo={summaryInfo.tokenMetainfo}
          tokenImage={summaryInfo.tokenMetainfo.image || `${UnknownTokenIcon}`}
          toAddress={summaryInfo.toAddress}
          transferBalance={getTransferBalance()}
          isErrorNetworkFee={isNetworkFeeError}
          isLoadingNetworkFee={useNetworkFeeReturn.isLoading}
          networkFee={networkFee}
          memo={summaryInfo.memo}
          currentBalance={currentBalance}
          useNetworkFeeReturn={useNetworkFeeReturn}
          onClickBack={onClickBack}
          onClickCancel={onClickCancel}
          onClickSend={transfer}
          onClickNetworkFeeSetting={onClickNetworkFeeSetting}
        />
      )}
    </TransferSummaryLayout>
  );
};

export default TransferSummaryContainer;
