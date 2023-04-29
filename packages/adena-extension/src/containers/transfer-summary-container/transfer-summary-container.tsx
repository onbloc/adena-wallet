import React, { useCallback, useEffect, useState } from 'react';
import TransferSummary from '@components/transfer/transfer-summary/transfer-summary';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { TokenMetainfo } from '@states/token';
import { Amount } from '@states/balance';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import BigNumber from 'bignumber.js';
import { useAdenaContext } from '@hooks/use-context';
import { useGnoClient } from '@hooks/use-gno-client';
import { useCurrentAccount } from '@hooks/use-current-account';
import { TransactionMessage } from '@services/index';

interface TransferSummaryInfo {
  tokenMetainfo: TokenMetainfo;
  toAddress: string;
  transferAmount: Amount;
  networkFee: Amount;
}

const TransferSummaryContainer: React.FC = () => {
  const { state } = useLocation();
  const { transactionService } = useAdenaContext();
  const [gnoClient] = useGnoClient();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const navigate = useNavigate();
  const [summaryInfo, setSummaryInfo] = useState<TransferSummaryInfo>(state)
  const [sendable, setSendable] = useState(true);

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
    const sendAmount = `${BigNumber(transferAmount.value).shiftedBy(tokenMetainfo.decimals)}${tokenMetainfo.minimalDenom}`;
    return TransactionMessage.createMessageOfBankSend({
      fromAddress: currentAddress || '',
      toAddress,
      amount: sendAmount,
    });
  }, [summaryInfo, currentAddress]);

  const getGRC20TransferMessage = useCallback(() => {
    const { tokenMetainfo, toAddress, transferAmount } = summaryInfo;
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

  const createTransaction = useCallback(async () => {
    if (!gnoClient || !currentAccount) {
      return null;
    }
    const { tokenMetainfo, networkFee } = summaryInfo;
    const GAS_WANTED = 1000000;
    const message = tokenMetainfo.type === 'NATIVE' ?
      getNativeTransferMessage() :
      getGRC20TransferMessage();
    const networkFeeAmount = BigNumber(networkFee.value).shiftedBy(6).toNumber();
    const { document, signature } = await transactionService.createSignDocument(
      gnoClient,
      currentAccount,
      [message],
      GAS_WANTED,
      networkFeeAmount
    );
    const transaction = await transactionService.createTransaction(document, signature);
    return transactionService.sendTransaction(gnoClient, transaction);
  }, [summaryInfo, currentAccount, currentAccount])

  const onClickBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const onClickCancel = useCallback(() => {
    if (state.isTokenSearch === true) {
      navigate(RoutePath.WalletSearch);
      return;
    }
    navigate(RoutePath.Wallet);
  }, [navigate]);

  const onClickSend = useCallback(() => {
    if (!sendable) {
      return;
    }
    setSendable(false);
    createTransaction()
      .then(() => navigate(RoutePath.History))
      .finally(() => setSendable(true))
  }, [summaryInfo, currentAccount, currentAccount]);

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