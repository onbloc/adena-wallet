import React, { useCallback, useEffect, useState } from 'react';
import BigNumber from 'bignumber.js';
import styled from 'styled-components';

import { isLedgerAccount } from 'adena-module';

import TransferSummary from '@components/pages/transfer-summary/transfer-summary/transfer-summary';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@types';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { TransactionMessage } from '@services/index';
import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import { useNetwork } from '@hooks/use-network';

import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';
import useDNSResolver from '@hooks/use-dns';

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
  const { wallet, gnoProvider } = useWalletContext();
  const { transactionService } = useAdenaContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const [isSent, setIsSent] = useState(false);
  const [isErrorNetworkFee, setIsErrorNetworkFee] = useState(false);


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
    const sendAmount = `${BigNumber(transferAmount.value).shiftedBy(tokenMetainfo.decimals)}${tokenMetainfo.denom
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

  const createDocument = useCallback(async () => {
    if (!currentNetwork || !currentAccount || !currentAddress) {
      return null;
    }
    const { tokenMetainfo, networkFee } = summaryInfo;
    const GAS_WANTED = 1000000;
    const message =
      tokenMetainfo.type === 'gno-native' ? getNativeTransferMessage() : getGRC20TransferMessage();
    const networkFeeAmount = BigNumber(networkFee.value).shiftedBy(6).toNumber();
    const document = await transactionService.createDocument(
      currentAccount,
      currentNetwork.networkId,
      [message],
      GAS_WANTED,
      networkFeeAmount,
    );
    return document;
  }, [summaryInfo, currentAccount]);

  const createTransaction = useCallback(async () => {
    const document = await createDocument();
    if (!currentNetwork || !currentAccount || !document || !wallet) {
      return null;
    }

    const walletInstance = wallet.clone();
    walletInstance.currentAccountId = currentAccount.id;
    const { signed } = await transactionService.createTransaction(walletInstance, document);
    return transactionService.sendTransaction(walletInstance, currentAccount, signed).catch((e) => {
      console.error(e);
      return null;
    });
  }, [summaryInfo, currentAccount, currentNetwork]);

  const hasNetworkFee = useCallback(async () => {
    if (!gnoProvider || !currentAddress) {
      return false;
    }

    const currentBalance = await gnoProvider.getBalance(currentAddress, 'ugnot');
    const networkFee = summaryInfo.networkFee.value;
    return BigNumber(currentBalance).shiftedBy(-6).isGreaterThanOrEqualTo(networkFee);
  }, [gnoProvider, currentAddress, summaryInfo]);

  const transfer = useCallback(async () => {
    if (isSent || !currentAccount) {
      return false;
    }

    const isNetworkFee = await hasNetworkFee();
    if (!isNetworkFee) {
      setIsErrorNetworkFee(true);
      return false;
    }

    setIsSent(true);
    if (isLedgerAccount(currentAccount)) {
      return transferByLedger();
    }
    return transferByCommon();
  }, [summaryInfo, currentAccount, isSent, hasNetworkFee]);

  const transferByCommon = useCallback(async () => {
    try {
      const result = await createTransaction();
      if (result) {
        navigate(RoutePath.History);
      }
    } catch (e) {
      if (!(e instanceof Error)) {
        return false;
      }
    }
    setIsSent(false);
    return false;
  }, [summaryInfo, currentAccount, isSent, hasNetworkFee]);

  const transferByLedger = useCallback(async () => {
    const document = await createDocument();
    if (document) {
      navigate(RoutePath.TransferLedgerLoading, { state: { document } });
    }
    return true;
  }, [summaryInfo, currentAccount, isSent, hasNetworkFee]);

  const onClickCancel = useCallback(() => {
    if (summaryInfo.isTokenSearch === true) {
      navigate(RoutePath.Wallet);
      return;
    }
    normalNavigate(-2);
  }, [summaryInfo, navigate]);

  return (
    <TransferSummaryLayout>
      <TransferSummary
        tokenMetainfo={summaryInfo.tokenMetainfo}
        tokenImage={summaryInfo.tokenMetainfo.image || `${UnknownTokenIcon}`}
        toAddress={summaryInfo.toAddress}
        transferBalance={getTransferBalance()}
        isErrorNetworkFee={isErrorNetworkFee}
        networkFee={summaryInfo.networkFee}
        onClickBack={goBack}
        onClickCancel={onClickCancel}
        onClickSend={transfer}
      />
    </TransferSummaryLayout>
  );
};

export default TransferSummaryContainer;
