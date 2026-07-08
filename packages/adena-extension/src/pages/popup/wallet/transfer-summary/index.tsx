import {
  CosmosDocument,
  Document,
  MSG_SEND_AMINO_TYPE,
  isLedgerAccount,
  isSessionAccount,
} from 'adena-module';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import AtomoneChainBadge from '@assets/icons/chains/atomone.svg';
import { GasToken } from '@common/constants/token.constant';
import { shouldMarkSessionRevoked } from '@common/utils/session-chain-visibility';
import {
  isCosmosNativeTokenModel,
  isGRC20TokenModel,
  isNativeTokenModel,
} from '@common/validation/validation-token';
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
import { getCosmosOriginDenom } from '@hooks/use-token-metainfo';
import { useTransferInfo } from '@hooks/use-transfer-info';
import { useCosmosNetworkFee } from '@hooks/wallet/use-cosmos-network-fee';
import { useGetGnotBalance } from '@hooks/wallet/use-get-gnot-balance';
import { useNetworkFee } from '@hooks/wallet/use-network-fee';
import {
  createNotificationSendMessage,
  createNotificationSendMessageByHash,
} from '@inject/message/methods/transaction-event';
import type { SessionMetadataV021 } from '@migrates/migrations/v021/storage-model-v021';
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
  const { wallet, gnoProvider } = useWalletContext();
  const { transactionService, chainRegistry, tokenRegistry, cosmosProvider, sessionRepository } =
    useAdenaContext();
  const queryClient = useQueryClient();
  const { currentAccount, currentAddress, currentFundingAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const isCosmosToken = isCosmosNativeTokenModel(params.tokenMetainfo);
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

  // ─── Cosmos: async address resolution + reactive document ──────────────
  const { data: cosmosAddress } = useQuery<string | null>(
    ['cosmosAddress', currentAccount?.id, chain?.bech32Prefix],
    async () => {
      if (!currentAccount || !isCosmosToken || !chain) return null;
      return currentAccount.getAddress(chain.bech32Prefix);
    },
    { enabled: !!currentAccount && isCosmosToken && !!chain },
  );

  const cosmosDocument = useMemo<CosmosDocument | null>(() => {
    if (!isCosmosToken || !cosmosAddress) return null;
    const { tokenMetainfo, toAddress, transferAmount, memo } = summaryInfo;
    if (tokenMetainfo.type !== 'cosmos-native') return null;
    // Prefer the persisted metainfo denom; fall back to the registry for
    // accounts whose stored entries predate the denom-seed fix.
    const profile = tokenRegistry.get(tokenMetainfo.tokenId);
    const denom =
      (tokenMetainfo as { denom?: string }).denom || (profile ? getCosmosOriginDenom(profile) : '');
    if (!denom) return null;
    const rawAmount = BigNumber(transferAmount.value).shiftedBy(tokenMetainfo.decimals).toFixed(0);
    const cosmosChain = chainRegistry.getChainByChainId(tokenMetainfo.networkId);
    const placeholderFee =
      cosmosChain && cosmosChain.chainType === 'cosmos' && cosmosChain.fee.fallbackFee
        ? cosmosChain.fee.fallbackFee
        : { amount: [{ denom, amount: '0' }], gas: '0' };
    return {
      chainId: tokenMetainfo.networkId,
      fromAddress: cosmosAddress,
      msgs: [
        {
          type: MSG_SEND_AMINO_TYPE,
          value: {
            from_address: cosmosAddress,
            to_address: toAddress,
            amount: [{ denom, amount: rawAmount }],
          },
        },
      ],
      fee: placeholderFee,
      memo: memo ?? '',
    };
  }, [summaryInfo, cosmosAddress, isCosmosToken, chainRegistry, tokenRegistry]);

  const cosmosFee = useCosmosNetworkFee(cosmosDocument);

  // Transfer-token denom (e.g. "uatone" or "uphoton") and the chain's fee
  // denom (always "uphoton" for atomone-1 outside the MintPhoton flow). When
  // they match, fee + amount must fit inside one balance; when they differ,
  // each side is checked against its own balance.
  const transferDenom = useMemo<string | null>(() => {
    if (!isCosmosToken) return null;
    const meta = summaryInfo.tokenMetainfo as { denom?: string };
    if (meta.denom) return meta.denom;
    const profile = tokenRegistry.get(summaryInfo.tokenMetainfo.tokenId);
    return profile ? getCosmosOriginDenom(profile) || null : null;
  }, [isCosmosToken, summaryInfo.tokenMetainfo, tokenRegistry]);
  const feeDenom = cosmosFee.currentFeeDenom;
  const sameDenom = !!transferDenom && !!feeDenom && transferDenom === feeDenom;

  const { data: photonBalance } = useQuery<string | null>(
    ['photonBalance', cosmosAddress],
    async () => {
      if (!cosmosAddress || !cosmosProvider) return null;
      return cosmosProvider.getBalance(cosmosAddress, 'uphoton');
    },
    { enabled: !!cosmosAddress && !!cosmosProvider && isCosmosToken },
  );

  // Only fetched when transferDenom != feeDenom (e.g. ATONE send). For
  // same-denom sends `photonBalance` already represents the transfer balance.
  const { data: transferTokenBalance } = useQuery<string | null>(
    ['cosmosTransferTokenBalance', cosmosAddress, transferDenom],
    async () => {
      if (!cosmosAddress || !cosmosProvider || !transferDenom) return null;
      return cosmosProvider.getBalance(cosmosAddress, transferDenom);
    },
    {
      enabled:
        !!cosmosAddress && !!cosmosProvider && isCosmosToken && !sameDenom && !!transferDenom,
    },
  );

  const hasNetworkFee = useMemo(() => {
    if (isCosmosToken) {
      if (photonBalance === undefined || photonBalance === null) return false;
      const rawFee = cosmosFee.currentFeeAmount;
      if (!rawFee || !Number(rawFee)) return false;
      const rawTransfer = BigNumber(summaryInfo.transferAmount.value)
        .shiftedBy(summaryInfo.tokenMetainfo.decimals)
        .toFixed(0);
      if (sameDenom) {
        // PHOTON send: single balance must cover transfer + fee.
        return BigNumber(photonBalance).gte(BigNumber(rawTransfer).plus(rawFee));
      }
      // ATONE (or other) send: transfer balance covers the amount, PHOTON
      // covers the fee.
      if (transferTokenBalance === undefined || transferTokenBalance === null) return false;
      return (
        BigNumber(photonBalance).gte(rawFee) && BigNumber(transferTokenBalance).gte(rawTransfer)
      );
    }

    if (!currentBalance || currentBalance === 0) {
      return false;
    }

    if (!networkFee || !Number(networkFee.amount)) {
      return false;
    }

    let leastUsedAmount = BigNumber(networkFee.amount);

    if (isNativeTokenModel(summaryInfo.tokenMetainfo)) {
      leastUsedAmount = leastUsedAmount.plus(BigNumber(summaryInfo.transferAmount.value));
    }

    const currentBalanceAmount = BigNumber(currentBalance).shiftedBy(GasToken.decimals * -1);
    if (currentBalanceAmount.isLessThan(leastUsedAmount)) {
      return false;
    }

    return true;
  }, [
    isCosmosToken,
    photonBalance,
    transferTokenBalance,
    sameDenom,
    cosmosFee.currentFeeAmount,
    currentBalance,
    networkFee?.amount,
    summaryInfo,
  ]);

  const isNetworkFeeError = useMemo(() => {
    if (isCosmosToken) {
      if (cosmosFee.isLoading) return false;
      if (cosmosFee.isSimulateError) return false;
      if (photonBalance === undefined || photonBalance === null) return false;
      // For different-denom sends we also need the transfer-token balance
      // before we can claim a fee error vs. a still-loading state.
      if (!sameDenom && (transferTokenBalance === undefined || transferTokenBalance === null)) {
        return false;
      }
      return !hasNetworkFee;
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
    cosmosFee.isLoading,
    cosmosFee.isSimulateError,
    photonBalance,
    transferTokenBalance,
    sameDenom,
    currentBalance,
    networkFee?.amount,
    useNetworkFeeReturn.isLoading,
    useNetworkFeeReturn.isSimulateError,
    hasNetworkFee,
  ]);

  const simulateErrorMessage = useMemo(() => {
    if (isCosmosToken) {
      if (cosmosFee.isLoading || !cosmosFee.isSimulateError) return null;
      return cosmosFee.simulateErrorMessage || 'Failed to estimate Cosmos fee';
    }

    if (!useNetworkFeeReturn.isSimulateError || useNetworkFeeReturn.isLoading) {
      return null;
    }

    return (
      useNetworkFeeReturn.currentGasInfo?.simulateErrorMessage || 'Failed to simulate transaction'
    );
  }, [
    isCosmosToken,
    cosmosFee.isLoading,
    cosmosFee.isSimulateError,
    cosmosFee.simulateErrorMessage,
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
      fromAddress: currentFundingAddress || '',
      toAddress,
      amount: sendAmount,
    });
  }, [summaryInfo, currentFundingAddress]);

  const getGRC20TransferMessage = useCallback(() => {
    const { tokenMetainfo, toAddress, transferAmount } = summaryInfo;

    if (!isGRC20TokenModel(tokenMetainfo)) {
      return;
    }

    return TransactionMessage.createMessageOfVmCall({
      caller: currentFundingAddress || '',
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
  }, [summaryInfo, currentFundingAddress]);

  const createDocument = async (): Promise<Document | null> => {
    if (!currentNetwork || !currentAccount || !currentAddress) {
      return null;
    }

    const { tokenMetainfo, memo } = summaryInfo;
    const gasWanted = useNetworkFeeReturn.currentGasInfo?.gasWanted || 0;
    const message = isNativeTokenModel(tokenMetainfo)
      ? getNativeTransferMessage()
      : getGRC20TransferMessage();

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

  const createCosmosTransaction = useCallback(async () => {
    if (!currentAccount || !cosmosDocument) {
      return null;
    }
    // StdFee.amount must be an integer string in u-units (e.g. "17148"),
    // not the display-shifted value from `networkFee.amount` ("0.017148")
    // because the node's sdk.Coin parser rejects decimals with "cannot unmarshal
    // into *big.Int". Use the raw fields from the hook.
    const feeAmount = cosmosFee.currentFeeAmount;
    const feeDenom = cosmosFee.currentFeeDenom;
    const feeGas = cosmosFee.currentFeeGas;
    if (!feeAmount || feeAmount === '0' || !feeDenom || !feeGas || feeGas === '0') {
      throw new Error('Cosmos fee estimation has not completed yet');
    }
    const document: CosmosDocument = {
      ...cosmosDocument,
      fee: {
        amount: [{ denom: feeDenom, amount: feeAmount }],
        gas: feeGas,
      },
    };
    const signed = await transactionService.signCosmos(currentAccount.id, document);
    return transactionService.broadcastCosmos(signed, cosmosDocument.chainId);
  }, [currentAccount, cosmosDocument, cosmosFee, transactionService]);

  const createTransaction = useCallback(async () => {
    if (!currentNetwork || !currentAccount || !wallet) {
      return null;
    }

    // Cosmos AMINO path (Phase 3): skips Gno createDocument/gas-simulate flow.
    // Let errors propagate so transferByCommon's catch surfaces the real
    // message (broadcast code/raw_log, LCD error, etc.) instead of the
    // generic "could not be submitted" fallback.
    if (isCosmosNativeTokenModel(summaryInfo.tokenMetainfo)) {
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

  const refreshCurrentSessionMetadataAfterTransfer = useCallback(async (): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: ['sessionMetadataForBalanceInput'] });
    queryClient.invalidateQueries({ queryKey: ['sessions/all'] });

    if (!currentAccount || !isSessionAccount(currentAccount) || !currentNetwork || !gnoProvider) {
      return;
    }

    const sessionAddr = await currentAccount
      .getAddress(currentNetwork.addressPrefix)
      .catch(() => null);
    if (!sessionAddr) {
      return;
    }

    const storedSession = await sessionRepository.get(sessionAddr);
    const previousSpendUsed = storedSession?.spendUsed ?? '';

    for (const delayMs of [0, 1_500, 4_000]) {
      if (delayMs > 0) {
        await wait(delayMs);
      }

      let record;
      try {
        record = await gnoProvider.getSession(currentAccount.getMasterAddress(), sessionAddr);
      } catch {
        continue;
      }
      if (!record) {
        const revoked = await shouldMarkSessionRevoked(
          storedSession,
          async () =>
            !!(await gnoProvider.getSession(currentAccount.getMasterAddress(), sessionAddr)),
        );
        if (revoked) {
          await sessionRepository.setStatus(sessionAddr, 'REVOKED').catch(() => undefined);
          queryClient.invalidateQueries({ queryKey: ['sessionMetadataForBalanceInput'] });
          queryClient.invalidateQueries({ queryKey: ['sessions/all'] });
        }
        break;
      }

      const base = record.BaseSessionAccount;
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiresAt = Number(base.expires_at ?? 0);
      const spendUsed = base.spend_used === '' ? undefined : base.spend_used;
      const spendReset =
        base.spend_reset != null && base.spend_reset !== '' ? Number(base.spend_reset) : undefined;

      // REVOKED is terminal — never let a chain read (which can still return a
      // record for a re-created session, or race the revoke) resurrect ACTIVE.
      const status: SessionMetadataV021['status'] =
        storedSession?.status === 'REVOKED'
          ? 'REVOKED'
          : expiresAt > 0 && nowSeconds >= expiresAt
          ? 'EXPIRED'
          : 'ACTIVE';

      await sessionRepository.syncFromChain(sessionAddr, {
        spendUsed,
        spendReset,
        status,
      });

      queryClient.invalidateQueries({ queryKey: ['sessionMetadataForBalanceInput'] });
      queryClient.invalidateQueries({ queryKey: ['sessions/all'] });

      if ((spendUsed ?? '') !== previousSpendUsed) {
        break;
      }
    }
  }, [
    currentAccount,
    currentNetwork,
    gnoProvider,
    queryClient,
    sessionRepository,
  ]);

  const transfer = async (): Promise<boolean> => {
    if (isSent || !currentAccount) {
      return false;
    }
    if (isCosmosToken && (!hasNetworkFee || cosmosFee.isLoading)) {
      return false;
    }
    if (!isCosmosToken && (!hasNetworkFee || useNetworkFeeReturn.isLoading)) {
      return false;
    }

    setIsSent(true);
    if (isLedgerAccount(currentAccount)) {
      if (isCosmosToken) {
        return transferByLedgerCosmos();
      }
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
        void refreshCurrentSessionMetadataAfterTransfer();
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
  }, [
    createTransaction,
    isCosmosToken,
    refreshCurrentSessionMetadataAfterTransfer,
    transactionService,
  ]);

  const transferByLedger = useCallback(async () => {
    const document = await createDocument();
    if (document) {
      navigate(RoutePath.TransferLedgerLoading, {
        state: { document, summary: summaryInfo },
      });
    }
    return true;
  }, [createDocument, navigate, summaryInfo]);

  const transferByLedgerCosmos = useCallback(async () => {
    if (!cosmosDocument) {
      return false;
    }
    const feeAmount = cosmosFee.currentFeeAmount;
    const feeDenom = cosmosFee.currentFeeDenom;
    const feeGas = cosmosFee.currentFeeGas;
    if (!feeAmount || feeAmount === '0' || !feeDenom || !feeGas || feeGas === '0') {
      return false;
    }
    const document: CosmosDocument = {
      ...cosmosDocument,
      fee: {
        amount: [{ denom: feeDenom, amount: feeAmount }],
        gas: feeGas,
      },
    };
    navigate(RoutePath.TransferLedgerCosmosLoading, {
      state: { document, summary: summaryInfo },
    });
    return true;
  }, [cosmosDocument, cosmosFee, navigate, summaryInfo]);

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
    if (isCosmosToken) {
      cosmosFee.save();
    } else {
      useNetworkFeeReturn.save();
    }
    setOpenedNetworkFeeSetting(false);
  }, [isCosmosToken, cosmosFee.save, useNetworkFeeReturn.save]);

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
    // When a Ledger loading page navigates back after broadcast, it seeds
    // `params.ledgerResult`, enter the RESULT screen so the Ledger user
    // gets the same completion UI (View History / View on Scanner / Close)
    // as HD/PK transfers instead of jumping straight to History.
    const ledgerResult = summaryInfo.ledgerResult;
    if (ledgerResult) {
      setTransferResult({
        status: ledgerResult.status,
        hash: ledgerResult.hash ?? null,
        errorMessage: ledgerResult.errorMessage ?? null,
      });
      setScreenState('RESULT');
    }
  }, []);

  useEffect(() => {
    // Cosmos path builds its document inline at broadcast time, skip the
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
          scannerLabel={isCosmosToken ? 'View on Mintscan' : 'View on GnoScan'}
        />
      ) : openedNetworkFeeSetting ? (
        <div className='network-fee-setting-wrapper'>
          <NetworkFeeSetting
            {...(isCosmosToken ? cosmosFee : useNetworkFeeReturn)}
            onClickBack={onClickNetworkFeeClose}
            onClickSave={onClickNetworkFeeSave}
          />
        </div>
      ) : (
        <TransferSummary
          tokenMetainfo={summaryInfo.tokenMetainfo}
          tokenImage={summaryInfo.tokenMetainfo.image || `${UnknownTokenIcon}`}
          toAddress={summaryInfo.toAddress}
          chainName={tokenProfile?.displayName || ''}
          chainBadgeImage={isCosmosToken ? AtomoneChainBadge : undefined}
          transferBalance={getTransferBalance()}
          isErrorNetworkFee={isNetworkFeeError}
          isLoadingNetworkFee={isCosmosToken ? cosmosFee.isLoading : useNetworkFeeReturn.isLoading}
          isSessionSigning={!!currentAccount && isSessionAccount(currentAccount)}
          networkFee={isCosmosToken ? cosmosFee.networkFee : networkFee}
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default TransferSummaryContainer;
