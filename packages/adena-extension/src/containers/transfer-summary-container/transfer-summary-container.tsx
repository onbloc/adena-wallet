import React, { useCallback, useEffect, useState } from 'react';
import TransferSummary from '@components/transfer/transfer-summary/transfer-summary';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { Amount } from '@states/balance';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import BigNumber from 'bignumber.js';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { TransactionMessage } from '@services/index';
import { isLedgerAccount } from 'adena-module';
import { TokenModel, isGRC20TokenModel, isNativeTokenModel } from '@models/token-model';
import { useNetwork } from '@hooks/use-network';

interface TransferSummaryInfo {
  tokenMetainfo: TokenModel;
  toAddress: string;
  transferAmount: Amount;
  networkFee: Amount;
}

const TransferSummaryContainer: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { transactionService } = useAdenaContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const [summaryInfo, setSummaryInfo] = useState<TransferSummaryInfo>(state)
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    setSummaryInfo(state);
  }, [state]);

  const getTransferBalance = useCallback(() => {
    const { value, denom } = summaryInfo.transferAmount;
    return {
      value: `${BigNumber(value).toFormat()}`,
      denom
    };
  }, [summaryInfo]);

  const getNativeTransferMessage = useCallback(() => {
    const { tokenMetainfo, toAddress, transferAmount } = summaryInfo;
    if (!isNativeTokenModel(tokenMetainfo)) {
      return;
    }
    const sendAmount = `${BigNumber(transferAmount.value).shiftedBy(tokenMetainfo.decimals)}${tokenMetainfo.denom}`;
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
      send: "",
      pkgPath: tokenMetainfo.pkgPath,
      func: "Transfer",
      args: [
        toAddress,
        transferAmount.value
      ]
    });
  }, [summaryInfo, currentAddress]);

  const createDocument = useCallback(async () => {
    if (!currentNetwork || !currentAccount) {
      return null;
    }
    const { tokenMetainfo, networkFee } = summaryInfo;
    const GAS_WANTED = 1000000;
    const message = tokenMetainfo.type === 'gno-native' ?
      getNativeTransferMessage() :
      getGRC20TransferMessage();
    const networkFeeAmount = BigNumber(networkFee.value).shiftedBy(6).toNumber();
    const document = await transactionService.createDocument(
      currentAccount,
      currentNetwork.networkId,
      [message],
      GAS_WANTED,
      networkFeeAmount
    );
    return document;
  }, [summaryInfo, currentAccount]);

  const createTransaction = useCallback(async () => {
    const document = await createDocument();
    if (!currentNetwork || !currentAccount || !document) {
      return null;
    }
    const signature = await transactionService.createSignature(currentAccount, document);

    const transaction = await transactionService.createTransaction(document, signature);
    return transactionService.sendTransaction(transaction);
  }, [summaryInfo, currentAccount, currentAccount]);

  const transfer = useCallback(async () => {
    if (isSent || !currentAccount) {
      return false;
    }
    setIsSent(true);
    if (isLedgerAccount(currentAccount)) {
      return transferByLedger();
    }
    return transferByCommon();
  }, [summaryInfo, currentAccount, currentAccount, isSent]);

  const transferByCommon = useCallback(async () => {
    try {
      await createTransaction();
      navigate(RoutePath.History);
    } catch (e) {
      if (!(e instanceof Error)) {
        return false;
      }
    }
    setIsSent(false);
    return false;
  }, [summaryInfo, currentAccount, currentAccount, isSent]);

  const transferByLedger = useCallback(async () => {
    const document = await createDocument();
    if (document) {
      const state = {
        document
      };
      navigate(RoutePath.TransferLedgerLoading, { state });
    }
    return true;
  }, [summaryInfo, currentAccount, currentAccount, isSent]);

  const onClickBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const onClickCancel = useCallback(() => {
    if (state.isTokenSearch === true) {
      navigate(RoutePath.Wallet);
      return;
    }
    navigate(-2);
  }, [navigate]);

  const onClickSend = useCallback(() => {
    transfer();
  }, [transfer]);

  return (
    <TransferSummary
      tokenMetainfo={summaryInfo.tokenMetainfo}
      tokenImage={summaryInfo.tokenMetainfo.image || `${UnknownTokenIcon}`}
      toAddress={summaryInfo.toAddress}
      transferBalance={getTransferBalance()}
      networkFee={summaryInfo.networkFee}
      onClickBack={onClickBack}
      onClickCancel={onClickCancel}
      onClickSend={onClickSend}
    />
  );
};

export default TransferSummaryContainer;