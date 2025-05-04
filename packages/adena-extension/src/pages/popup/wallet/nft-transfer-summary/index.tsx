import { Document, isLedgerAccount } from 'adena-module';
import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { GasToken, GNOT_TOKEN } from '@common/constants/token.constant';
import NetworkFeeSetting from '@components/pages/network-fee-setting/network-fee-setting/network-fee-setting';
import NFTTransferSummary from '@components/pages/nft-transfer-summary/nft-transfer-summary/nft-transfer-summary';
import { useGetGRC721TokenUri } from '@hooks/nft/use-get-grc721-token-uri';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useTransferInfo } from '@hooks/use-transfer-info';
import { useNetworkFee } from '@hooks/wallet/use-network-fee';
import { createNotificationSendMessage } from '@inject/message/methods/transaction-event';
import { TransactionMessage } from '@services/index';
import mixins from '@styles/mixins';
import { GRC721Model, RoutePath } from '@types';

const NFTTransferSummaryLayout = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;
  padding: 24px 20px 116px;
`;

const NFTTransferSummaryContainer: React.FC = () => {
  const normalNavigate = useNavigate();
  const { navigate, goBack, params } = useAppNavigate<RoutePath.NftTransferSummary>();
  const summaryInfo = params;
  const { wallet, gnoProvider } = useWalletContext();
  const { transactionService } = useAdenaContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const { memorizedTransferInfo, setMemorizedTransferInfo } = useTransferInfo();
  const [isSent, setIsSent] = useState(false);
  const [isErrorNetworkFee, setIsErrorNetworkFee] = useState(false);
  const [openedNetworkFeeSetting, setOpenedNetworkFeeSetting] = useState(false);
  const [document, setDocument] = useState<Document | null>(null);

  const useNetworkFeeReturn = useNetworkFee(document);
  const networkFee = useNetworkFeeReturn.networkFee;

  const makeGRC721TransferMessage = useCallback(
    (grc721Token: GRC721Model, fromAddress: string, toAddress: string) => {
      return TransactionMessage.createMessageOfVmCall({
        caller: fromAddress,
        send: '',
        pkgPath: grc721Token.packagePath,
        func: 'TransferFrom',
        args: [fromAddress, toAddress, grc721Token.tokenId],
      });
    },
    [],
  );

  const createDocument = useCallback(async () => {
    if (!currentNetwork || !currentAccount || !currentAddress) {
      return null;
    }

    const { grc721Token, toAddress, memo } = summaryInfo;
    const message = makeGRC721TransferMessage(grc721Token, currentAddress, toAddress);

    const document = await transactionService.createDocument(
      currentAccount,
      currentNetwork.networkId,
      [message],
      useNetworkFeeReturn.currentGasInfo?.gasWanted || 0,
      useNetworkFeeReturn.currentGasFeeRawAmount,
      memo,
    );

    return document;
  }, [summaryInfo, currentAccount]);

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
  }, [summaryInfo, currentAccount, currentNetwork, networkFee]);

  const hasNetworkFee = useCallback(async () => {
    if (!gnoProvider || !currentAddress) {
      return false;
    }

    const currentBalance = await gnoProvider.getBalance(currentAddress, GNOT_TOKEN.denom);

    if (!networkFee) {
      return false;
    }

    return BigNumber(currentBalance)
      .shiftedBy(GasToken.decimals * -1)
      .isGreaterThanOrEqualTo(networkFee.amount);
  }, [gnoProvider, currentAddress, summaryInfo, networkFee]);

  const transfer = async (): Promise<boolean> => {
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
    if (memorizedTransferInfo) {
      setMemorizedTransferInfo({
        ...memorizedTransferInfo,
        memo: summaryInfo.memo,
        toAddress: summaryInfo.toAddress,
      });
    }

    goBack();
  }, [memorizedTransferInfo, summaryInfo]);

  const onClickCancel = useCallback(() => {
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
    setIsErrorNetworkFee(false);
    setOpenedNetworkFeeSetting(false);
  }, [useNetworkFeeReturn.save]);

  useEffect(() => {
    createDocument().then((doc) => {
      if (!doc) {
        return;
      }

      setDocument(doc);
    });
  }, [
    wallet,
    summaryInfo,
    currentAccount,
    currentNetwork,
    useNetworkFeeReturn.currentGasFeeRawAmount,
  ]);

  return (
    <NFTTransferSummaryLayout>
      {openedNetworkFeeSetting ? (
        <NetworkFeeSetting
          {...useNetworkFeeReturn}
          onClickBack={onClickNetworkFeeClose}
          onClickSave={onClickNetworkFeeSave}
        />
      ) : (
        <NFTTransferSummary
          grc721Token={summaryInfo.grc721Token}
          toAddress={summaryInfo.toAddress}
          isErrorNetworkFee={isErrorNetworkFee}
          networkFee={networkFee}
          memo={summaryInfo.memo}
          queryGRC721TokenUri={useGetGRC721TokenUri}
          onClickBack={onClickBack}
          onClickCancel={onClickCancel}
          onClickSend={transfer}
          onClickNetworkFeeSetting={onClickNetworkFeeSetting}
        />
      )}
    </NFTTransferSummaryLayout>
  );
};

export default NFTTransferSummaryContainer;
