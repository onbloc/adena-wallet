import {
  CosmosDocument,
  Document,
  MSG_SEND_AMINO_TYPE,
  isLedgerAccount,
} from 'adena-module';
import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import { GasToken } from '@common/constants/token.constant';
import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import TransactionResult from '@components/molecules/transaction-result';
import NetworkFeeSetting from '@components/pages/network-fee-setting/network-fee-setting/network-fee-setting';
import TransferSummary from '@components/pages/transfer-summary/transfer-summary/transfer-summary';
import useAppNavigate from '@hooks/use-app-navigate';
import { useChain } from '@hooks/use-chain';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { useNetworkProfile } from '@hooks/use-network-profile';
import { useTransferInfo } from '@hooks/use-transfer-info';
import { useGetGnotBalance } from '@hooks/wallet/use-get-gnot-balance';
import { useNetworkFee } from '@hooks/wallet/use-network-fee';
import {
  createNotificationSendMessage,
  createNotificationSendMessageByHash,
} from '@inject/message/methods/transaction-event';
import BroadcastTransactionLoading from '@pages/popup/wallet/broadcast-transaction-screen/loading';
import { TransactionMessage } from '@services/index';
import mixins from '@styles/mixins';
import { RoutePath } from '@types';

const TransferSummaryLayout = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: 100%;
  overflow-y: auto;

  & .network-fee-setting-wrapper {
    padding: 24px 20px;
  }
`;

const TransferSummaryContainer: React.FC = () => {
  const normalNavigate = useNavigate();
  const { navigate, goBack, params } = useAppNavigate<RoutePath.TransferSummary>();
  const summaryInfo = params;
  const { wallet } = useWalletContext();
  const { transactionService, chainRegistry } = useAdenaContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const isCosmosToken = params.tokenMetainfo.type === 'cosmos-native';
  const tokenChainGroup = isCosmosToken
    ? chainRegistry.getChainByChainId(params.tokenMetainfo.networkId)?.chainGroup ?? 'atomone'
    : 'gno';
  const chain = useChain(tokenChainGroup);
  const tokenProfile = useNetworkProfile(tokenChainGroup);
  const { openScannerLink } = useLink();
  const { setMemorizedTransferInfo } = useTransferInfo();
  const [isSent, setIsSent] = useState(false);
  const [screenState, setScreenState] = useState<'SUMMARY' | 'LOADING' | 'RESULT'>('SUMMARY');
  const [transferResult, setTransferResult] = useState<{
    status: 'SUCCESS' | 'FAILED';
    hash?: string | null;
    errorMessage?: string | null;
  } | null>(null);
  const [openedNetworkFeeSetting, setOpenedNetworkFeeSetting] = useState(false);
  const [document, setDocument] = useState<Document | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  const useNetworkFeeReturn = useNetworkFee(document, false);
  const networkFee = useNetworkFeeReturn.networkFee;

  const { data: currentBalance } = useGetGnotBalance();

  const hasNetworkFee = useMemo(() => {
    // Cosmos fee is hardcoded (2000uphoton/gas 200000) for Phase 3 MVP.
    // Node rejects with a clear error if PHOTON balance is insufficient, so we
    // defer that check to the broadcast path instead of gating the UI here.
    // TODO(Phase 6): replace hardcoded fee gate with feemarket dynamic estimation.
    if (isCosmosToken) {
      return true;
    }

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
    // Cosmos path skips the Gno gas-simulate / balance check entirely.
    if (isCosmosToken) {
      return false;
    }

    if (useNetworkFeeReturn.isLoading) {
      return false;
    }

    if (useNetworkFeeReturn.isSimulateError) {
      return false;
    }

    if (currentBalance === null || currentBalance === undefined) {
      return false;
    }

    if (currentBalance === 0) {
      return true;
    }

    return !hasNetworkFee;
  }, [
    isCosmosToken,
    currentBalance,
    networkFee?.amount,
    useNetworkFeeReturn.isLoading,
    useNetworkFeeReturn.isSimulateError,
    hasNetworkFee,
  ]);

  const simulateErrorMessage = useMemo(() => {
    if (!useNetworkFeeReturn.isSimulateError || useNetworkFeeReturn.isLoading) {
      return null;
    }

    return (
      useNetworkFeeReturn.currentGasInfo?.simulateErrorMessage || 'Failed to simulate transaction'
    );
  }, [
    useNetworkFeeReturn.isSimulateError,
    useNetworkFeeReturn.isLoading,
    useNetworkFeeReturn.currentGasInfo?.simulateErrorMessage,
  ]);

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
      max_deposit: '',
      func: 'Transfer',
      args: [
        toAddress,
        `${Math.round(
          BigNumber(transferAmount.value).shiftedBy(tokenMetainfo.decimals).toNumber(),
        )}`,
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
      chain.bech32Prefix,
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

  // Cosmos (Phase 3): MVP hardcodes fee at 2000uphoton / gas 200000.
  // Node's minGasPrice is 0.01 uphoton/gas → 0.01 * 200000 = 2000uphoton required.
  // TODO(Phase 6): replace with feemarket dynamic estimation; move constant to
  //                common/constants/tx.constant.ts and read denom from chain profile.
  const COSMOS_DEFAULT_FEE = {
    amount: [{ denom: 'uphoton', amount: '2000' }],
    gas: '200000',
  };

  const createCosmosTransaction = useCallback(async () => {
    if (!currentAccount) {
      return null;
    }

    const { tokenMetainfo, toAddress, transferAmount, memo } = summaryInfo;
    if (tokenMetainfo.type !== 'cosmos-native') {
      return null;
    }

    const denom = (tokenMetainfo as { denom?: string }).denom;
    if (!denom) {
      throw new Error('Cosmos native token is missing denom metadata');
    }

    const cosmosChainId = tokenMetainfo.networkId;
    const fromAddress = await currentAccount.getAddress(chain.bech32Prefix);
    const rawAmount = BigNumber(transferAmount.value)
      .shiftedBy(tokenMetainfo.decimals)
      .toFixed(0);

    const document: CosmosDocument = {
      chainId: cosmosChainId,
      fromAddress,
      msgs: [
        {
          type: MSG_SEND_AMINO_TYPE,
          value: {
            from_address: fromAddress,
            to_address: toAddress,
            amount: [{ denom, amount: rawAmount }],
          },
        },
      ],
      fee: COSMOS_DEFAULT_FEE,
      memo: memo ?? '',
    };

    const signed = await transactionService.signCosmos(currentAccount.id, document);
    return transactionService.broadcastCosmos(signed, cosmosChainId);
  }, [summaryInfo, currentAccount, chain, transactionService]);

  const createTransaction = useCallback(async () => {
    if (!currentNetwork || !currentAccount || !wallet) {
      return null;
    }

    // Cosmos AMINO path (Phase 3) — skips Gno createDocument/gas-simulate flow.
    // Let errors propagate so transferByCommon's catch surfaces the real
    // message (broadcast code/raw_log, LCD error, etc.) instead of the
    // generic "could not be submitted" fallback.
    if (summaryInfo.tokenMetainfo.type === 'cosmos-native') {
      const result = await createCosmosTransaction();
      if (!result) return null;
      return { hash: result.txhash };
    }

    const document = await createDocument();
    if (!document) {
      return null;
    }

    const walletInstance = wallet.clone();
    walletInstance.currentAccountId = currentAccount.id;

    const { signed } = await transactionService.createTransaction(
      walletInstance,
      currentAccount,
      document,
    );

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
    createCosmosTransaction,
  ]);

  const transfer = async (): Promise<boolean> => {
    if (isSent || !currentAccount) {
      return false;
    }
    // Cosmos path skips Gno-only preconditions (hasNetworkFee, gas simulate).
    if (!isCosmosToken && (!hasNetworkFee || useNetworkFeeReturn.isLoading)) {
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
      setScreenState('LOADING');
      const response = await createTransaction();
      const txHash = response?.hash || null;
      if (isCosmosToken) {
        if (txHash) createNotificationSendMessageByHash(txHash);
      } else {
        // Type-narrow: non-cosmos path returns TM2 broadcast result.
        createNotificationSendMessage(
          response as Awaited<ReturnType<typeof transactionService.sendTransaction>> | null,
        );
      }

      if (txHash) {
        setTransferResult({
          status: 'SUCCESS',
          hash: txHash,
        });
      } else {
        setTransferResult({
          status: 'FAILED',
          errorMessage: 'Your transaction could not be submitted to the blockchain. Try again.',
        });
      }
      setScreenState('RESULT');
      setIsSent(false);
      return Boolean(txHash);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setTransferResult({
        status: 'FAILED',
        errorMessage,
      });
      setScreenState('RESULT');
      setIsSent(false);
      return false;
    }
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

  const onClickViewHistory = useCallback(() => {
    navigate(RoutePath.History);
  }, [navigate]);

  const onClickCloseResult = useCallback(() => {
    navigate(RoutePath.Wallet);
  }, [navigate]);

  const onClickViewGnoscan = useCallback(() => {
    if (!transferResult?.hash) {
      return;
    }

    // Cosmos tx → Mintscan (path-style: /atomone/tx/{hash}).
    // Gno tx → existing gnoscan (query-string: /transactions/details?txhash=...).
    if (isCosmosToken) {
      if (tokenProfile?.linkUrl) {
        window.open(`${tokenProfile.linkUrl}/tx/${transferResult.hash}`, '_blank');
      }
      return;
    }

    openScannerLink('/transactions/details', { txhash: transferResult.hash });
  }, [transferResult?.hash, openScannerLink, isCosmosToken, tokenProfile]);

  useEffect(() => {
    if (simulateErrorMessage) {
      requestAnimationFrame(() => {
        const el = layoutRef.current;
        if (el) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
      });
    }
  }, [simulateErrorMessage]);

  useEffect(() => {
    // Cosmos path builds its document inline at broadcast time — skip the
    // Gno-only createDocument pre-warm which calls GnoProvider.getAccountInfo.
    if (isCosmosToken) {
      return;
    }
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
    isCosmosToken,
  ]);

  return (
    <TransferSummaryLayout ref={layoutRef}>
      {screenState === 'LOADING' ? (
        <BroadcastTransactionLoading />
      ) : screenState === 'RESULT' && transferResult ? (
        <TransactionResult
          status={transferResult.status}
          errorMessage={transferResult.errorMessage}
          onClickViewHistory={onClickViewHistory}
          onClickViewGnoscan={onClickViewGnoscan}
          onClickClose={onClickCloseResult}
        />
      ) : openedNetworkFeeSetting ? (
        <div className='network-fee-setting-wrapper'>
          <NetworkFeeSetting
            {...useNetworkFeeReturn}
            onClickBack={onClickNetworkFeeClose}
            onClickSave={onClickNetworkFeeSave}
          />
        </div>
      ) : (
        <TransferSummary
          tokenMetainfo={summaryInfo.tokenMetainfo}
          tokenImage={summaryInfo.tokenMetainfo.image || `${UnknownTokenIcon}`}
          toAddress={summaryInfo.toAddress}
          transferBalance={getTransferBalance()}
          isErrorNetworkFee={isNetworkFeeError}
          // TEMP (Phase 3 MVP): Cosmos fee is hardcoded so the Gno gas-simulate
          // hook stays in its loading state forever (enabled=false when document
          // is null). Force loading=false and inject the fixed fee here to unblock
          // the Send button.
          // TODO(Phase 6): remove this override once feemarket estimation lands.
          isLoadingNetworkFee={isCosmosToken ? false : useNetworkFeeReturn.isLoading}
          networkFee={
            isCosmosToken ? { amount: '0.002', denom: 'PHOTON' } : networkFee
          }
          memo={summaryInfo.memo}
          currentBalance={currentBalance}
          useNetworkFeeReturn={useNetworkFeeReturn}
          simulateErrorBannerMessage={simulateErrorMessage}
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
