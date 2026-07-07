/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  TM2Error,
} from '@gnolang/tm2-js-client';
import {
  Account,
  Document,
  isAirgapAccount,
  isLedgerAccount,
  isSessionAccount,
  MSG_CREATE_SESSION_ENDPOINT,
  MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
  MSG_REVOKE_SESSION_ENDPOINT,
} from 'adena-module';
import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import { GasToken, GNOT_TOKEN } from '@common/constants/token.constant';
import { mappedTransactionMessages } from '@common/mapper/transaction-mapper';
import { getDappVisibleAddress, getWalletFundingAddress } from '@common/utils/account-address';
import { isSessionSupportedNetwork } from '@common/utils/account-session';
import { parseTokenAmount } from '@common/utils/amount-utils';
import { validateMessageArguments } from '@common/utils/argument-validation';
import {
  createFaviconByHostname,
  decodeParameter,
  parseParameters,
} from '@common/utils/client-utils';
import { fetchHealth } from '@common/utils/fetch-utils';
import { parseSimulateErrors } from '@common/utils/transaction-error-parser';
import { validateInjectionDataWithAddress } from '@common/validation/validation-transaction';
import {
  evaluateSessionSigningGuard,
  SessionSigningGuardDecision,
} from '@services/transaction/session-signing-guard';
import { ApproveTransaction } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';
import { useChain } from '@hooks/use-chain';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useGnoSessionUpdates } from '@hooks/use-gno-session-updates';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { useNetworkFee } from '@hooks/wallet/use-network-fee';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage } from '@inject/types';
import { NetworkMetainfo, RoutePath } from '@types';
import ApproveTransactionLoading from './loading';
import ApproveTransactionResult from './result';

interface TransactionData {
  messages: readonly any[];
  contracts: { type: string; function: string; value: any }[];
  gasWanted: string;
  gasFee: string;
  memo: string;
  document: Document;
}

function makeDefaultNetworkInfo(chainId: string, rpcUrl: string, addressPrefix: string): NetworkMetainfo {
  return {
    addressPrefix,
    chainId,
    rpcUrl,
    networkId: chainId,
    networkName: '',
    apiUrl: '',
    indexerUrl: '',
    chainName: '',
    default: false,
    gnoUrl: '',
    id: chainId,
    linkUrl: '',
  };
}

function mappedTransactionData(document: Document): TransactionData {
  return {
    messages: document.msgs,
    contracts: document.msgs.map((message: any) => {
      return {
        type: message?.type || '',
        function: message?.type === '/bank.MsgSend' ? 'Transfer' : message?.value?.func || '',
        value: message?.value || '',
      };
    }),
    gasWanted: document.fee.gas,
    gasFee: `${document.fee.amount[0].amount}${document.fee.amount[0].denom}`,
    memo: `${document.memo || ''}`,
    document,
  };
}

const checkHealth = (rpcUrl: string, requestKey?: string): NodeJS.Timeout =>
  setTimeout(async () => {
    const { healthy } = await fetchHealth(rpcUrl);
    if (healthy === false) {
      chrome.runtime.sendMessage(
        InjectionMessageInstance.failure(WalletResponseFailureType.NETWORK_TIMEOUT, {}, requestKey),
      );
      return;
    }
  }, 5000);

const SESSION_ADMIN_MESSAGE_TYPES = new Set<string>([
  MSG_CREATE_SESSION_ENDPOINT,
  MSG_REVOKE_SESSION_ENDPOINT,
  MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
]);

const getMessageType = (message: any): string | undefined => {
  const type = message?.type ?? message?.['@type'] ?? message?.type_url ?? message?.typeUrl;
  return typeof type === 'string' ? type : undefined;
};

const hasSessionAdminMessage = (messages: readonly any[] | undefined): boolean => {
  return (messages ?? []).some((message) =>
    SESSION_ADMIN_MESSAGE_TYPES.has(getMessageType(message) ?? ''),
  );
};

const ApproveTransactionContainer: React.FC = () => {
  const { wallet } = useWalletContext();
  const nomarlNavigate = useNavigate();
  const { navigate } = useAppNavigate();
  const { gnoProvider, changeNetwork } = useWalletContext();
  const { walletService, transactionService, sessionRepository } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [transactionData, setTransactionData] = useState<TransactionData>();
  const [hostname, setHostname] = useState('');
  const location = useLocation();
  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);
  const [document, setDocument] = useState<Document>();
  const { currentNetwork: currentWalletNetwork } = useNetwork();
  const chain = useChain();
  const [currentBalance, setCurrentBalance] = useState(0);
  const [screenState, setScreenState] = useState<'APPROVE' | 'LOADING' | 'RESULT'>('APPROVE');
  const [response, setResponse] = useState<InjectionMessage | null>(null);
  const [memo, setMemo] = useState('');
  const [transactionMessages, setTransactionMessages] = useState<ContractMessage[]>([]);
  const { openScannerLink } = useLink();
  const [requiresHoldConfirmation, setRequiresHoldConfirmation] = useState(false);
  const isInitialRenderRef = useRef(true);
  const isAutoClosedResultRef = useRef(false);

  const requestedSignerAccountId = useMemo(() => {
    const value = requestData?.data?.signerAccountId;
    return typeof value === 'string' && value.length > 0 ? value : null;
  }, [requestData?.data?.signerAccountId]);

  const signingAccount = useMemo<Account | null>(() => {
    if (requestedSignerAccountId) {
      return wallet?.accounts.find((account) => account.id === requestedSignerAccountId) ?? null;
    }
    return currentAccount;
  }, [currentAccount, requestedSignerAccountId, wallet]);

  const signingAccountMissing = useMemo(() => {
    return !!requestedSignerAccountId && !!wallet && !signingAccount;
  }, [requestedSignerAccountId, signingAccount, wallet]);

  const currentNetwork: NetworkMetainfo = useMemo(() => {
    const networkInfo = requestData?.data?.networkInfo;
    if (!!networkInfo?.chainId && !!networkInfo?.rpcUrl) {
      return makeDefaultNetworkInfo(networkInfo.chainId, networkInfo.rpcUrl, chain.bech32Prefix);
    }

    return currentWalletNetwork;
  }, [currentWalletNetwork, requestData]);

  useEffect(() => {
    if (
      currentWalletNetwork?.chainId === currentNetwork.chainId &&
      currentWalletNetwork?.rpcUrl === currentNetwork.rpcUrl
    ) {
      return;
    }

    changeNetwork(currentNetwork);
  }, [
    changeNetwork,
    currentNetwork.chainId,
    currentNetwork.rpcUrl,
    currentWalletNetwork?.chainId,
    currentWalletNetwork?.rpcUrl,
  ]);

  const isRequestedNetworkReady = useMemo(() => {
    const networkInfo = requestData?.data?.networkInfo;
    if (!networkInfo?.chainId || !networkInfo?.rpcUrl) {
      return true;
    }

    return (
      currentWalletNetwork?.chainId === networkInfo.chainId &&
      currentWalletNetwork?.rpcUrl === networkInfo.rpcUrl
    );
  }, [
    currentWalletNetwork?.chainId,
    currentWalletNetwork?.rpcUrl,
    requestData?.data?.networkInfo,
  ]);

  const isSessionAdminNetworkUnsupported = useMemo(() => {
    return (
      hasSessionAdminMessage(requestData?.data?.messages) &&
      !isSessionSupportedNetwork(currentNetwork)
    );
  }, [currentNetwork, requestData?.data?.messages]);
  const sessionAdminNetworkUnsupportedMessage = isSessionAdminNetworkUnsupported
    ? 'Session accounts are only supported on Testnet 13.'
    : null;

  const isSessionAdminSigningAccountUnsupported = useMemo(() => {
    return (
      hasSessionAdminMessage(requestData?.data?.messages) &&
      !!signingAccount &&
      isSessionAccount(signingAccount)
    );
  }, [requestData?.data?.messages, signingAccount]);
  const sessionAdminSigningAccountUnsupportedMessage = isSessionAdminSigningAccountUnsupported
    ? 'Session account management must be signed by the master account.'
    : null;
  const signingAccountMissingMessage = signingAccountMissing
    ? 'Requested signing account was not found.'
    : null;
  const approvalBlocked =
    isSessionAdminNetworkUnsupported ||
    isSessionAdminSigningAccountUnsupported ||
    signingAccountMissing;

  const hasMemo = useMemo(() => {
    if (!requestData?.data?.memo) {
      return false;
    }
    return true;
  }, [requestData?.data?.memo]);

  const argumentInfos: GnoArgumentInfo[] = useMemo(() => {
    return requestData?.data?.arguments || [];
  }, [requestData?.data?.arguments]);

  const argumentValidationErrors = useMemo(() => {
    return validateMessageArguments(transactionMessages, argumentInfos);
  }, [transactionMessages, argumentInfos]);

  const hasArgumentValidationError = useMemo(() => {
    return argumentValidationErrors.messageErrors.some((e) => !!e);
  }, [argumentValidationErrors]);

  const simulateDocument = useMemo(() => {
    if (!isRequestedNetworkReady) return null;
    if (hasArgumentValidationError) return null;
    return document;
  }, [document, hasArgumentValidationError, isRequestedNetworkReady]);

  const useNetworkFeeReturn = useNetworkFee(simulateDocument, true);
  const networkFee = useNetworkFeeReturn.networkFee;

  const isVisibleResult = useMemo(() => {
    return requestData?.data?.isVisibleResult !== false;
  }, [requestData?.data?.isVisibleResult]);

  const displayNetworkFee = useMemo(() => {
    if (!networkFee) {
      return {
        amount: '',
        denom: '',
      };
    }

    return {
      amount: networkFee.amount,
      denom: GasToken.symbol,
    };
  }, [networkFee]);

  const maxDepositAmount = useMemo(() => {
    const accumulatedAmount = document?.msgs.reduce((acc, msg): number => {
      const messageValue = msg.value;
      const amountStr = messageValue?.max_deposit;
      if (!amountStr) {
        return acc;
      }

      try {
        const amount = parseTokenAmount(amountStr);
        return BigNumber(acc).plus(amount).toNumber();
      } catch {
        return acc;
      }
    }, 0);

    return accumulatedAmount;
  }, [document]);

  const consumedTokenAmount = useMemo(() => {
    const accumulatedAmount = document?.msgs.reduce((acc, msg) => {
      const messageValue = msg.value;
      const amountStr = messageValue?.amount || messageValue?.amount || messageValue?.max_deposit;
      if (!amountStr) {
        return acc;
      }

      try {
        const amount = parseTokenAmount(amountStr);
        return BigNumber(acc).plus(amount).toNumber();
      } catch {
        return acc;
      }
    }, 0);

    const consumedBN = BigNumber(accumulatedAmount || 0).shiftedBy(GasToken.decimals * -1);
    return consumedBN.toNumber();
  }, [document]);

  const isErrorNetworkFee = useMemo(() => {
    if (!networkFee) {
      return false;
    }

    if (currentBalance === 0) {
      return true;
    }

    const resultConsumedAmount = BigNumber(consumedTokenAmount).plus(networkFee.amount);

    return BigNumber(currentBalance)
      .shiftedBy(GasToken.decimals * -1)
      .isLessThan(resultConsumedAmount);
  }, [networkFee?.amount, currentBalance, consumedTokenAmount]);

  // Extract funcName and pkgPath from the first message for session tracking
  const { funcName, pkgPath } = useMemo(() => {
    const firstMessage = requestData?.data?.messages?.[0];
    if (firstMessage?.type === '/vm.m_call') {
      return {
        funcName: firstMessage.value?.func || '',
        pkgPath: firstMessage.value?.pkg_path || '',
      };
    }

    return { funcName: '', pkgPath: '' };
  }, [requestData?.data?.messages]);

  const handleFinishHold = useCallback((finished: boolean) => {
    if (finished) {
      setRequiresHoldConfirmation(false);
    }
  }, []);

  // Subscribe to Gno session updates for real-time parameter changes
  useGnoSessionUpdates({
    funcName: funcName || undefined,
    pkgPath: pkgPath || undefined,
    onParamsChange: useCallback(
      (newParams: Record<string, string>) => {
        if (isInitialRenderRef.current) {
          isInitialRenderRef.current = false;
          return;
        }

        setTransactionMessages((prevMessages) => {
          return prevMessages.map((msg) => {
            if (msg.type !== '/vm.m_call') return msg;

            // Update args based on new params
            const msgValue = msg.value as { args?: string[] };
            const currentArgs = msgValue.args || [];
            const updatedArgs = currentArgs.map((arg: string, index: number) => {
              const argInfo = argumentInfos[index];
              if (argInfo && newParams[argInfo.key] !== undefined) {
                return newParams[argInfo.key];
              }
              return arg;
            });

            return {
              ...msg,
              value: {
                ...msg.value,
                args: updatedArgs,
              },
            };
          });
        });

        setRequiresHoldConfirmation(true);
      },
      [argumentInfos],
    ),
  });

  const checkLockWallet = (): void => {
    walletService
      .isLocked()
      .then((locked) => locked && nomarlNavigate(RoutePath.ApproveLogin + location.search));
  };

  const initRequestData = (): void => {
    const data = parseParameters(location.search);
    const parsedData = decodeParameter(data['data']);
    setRequestData({ ...parsedData, hostname: data['hostname'] });
  };

  const validate = async (
    currentAccount: Account,
    requestData: InjectionMessage,
  ): Promise<boolean> => {
    const address = await getDappVisibleAddress(currentAccount, chain.bech32Prefix);
    const validationMessage = validateInjectionDataWithAddress(requestData, address);
    if (validationMessage) {
      chrome.runtime.sendMessage(validationMessage);
      return false;
    }
    return true;
  };

  const initFavicon = async (): Promise<void> => {
    const faviconData = await createFaviconByHostname(
      requestData?.hostname ? `${requestData?.protocol}//${requestData?.hostname}` : '',
    );
    setFavicon(faviconData);
  };

  const initBalance = (address: string): void => {
    if (!gnoProvider || !address) {
      return;
    }

    gnoProvider
      .getBalance(address, GNOT_TOKEN.denom)
      .then((balance) => {
        setCurrentBalance(balance);
      })
      .catch(() => {
        // Balance is best-effort; ignore fetch failures.
      });
  };

  const initTransactionData = async (): Promise<boolean> => {
    if (!currentNetwork || !signingAccount || !requestData) {
      return false;
    }
    try {
      const document = await transactionService.createDocument(
        signingAccount,
        currentNetwork.networkId,
        requestData?.data?.messages,
        chain.bech32Prefix,
        requestData?.data?.gasWanted,
        requestData?.data?.gasFee,
        requestData?.data?.memo,
      );
      setDocument(document);
      setTransactionData(mappedTransactionData(document));
      setHostname(requestData?.hostname ?? '');
      setMemo(document.memo);
      setTransactionMessages(mappedTransactionMessages(document.msgs));
      return true;
    } catch (e) {
      const error: any = e;
      if (error?.message === 'Connection Error') {
        const { rpcUrl } = currentNetwork;
        checkHealth(rpcUrl, requestData.key);
      }
      if (error?.message === 'Transaction signing request was rejected by the user') {
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure(
            WalletResponseFailureType.TRANSACTION_FAILED,
            { error: { message: error?.message } },
            requestData?.key,
          ),
        );
      }
    }
    return false;
  };

  const updateTransactionData = (): void => {
    if (!document) {
      return;
    }

    const currentMemo = memo;
    const currentGasFee = useNetworkFeeReturn.currentGasFeeRawAmount;
    const currentGasWanted = useNetworkFeeReturn.currentGasInfo?.gasWanted || 0;

    const updatedDocument: Document = {
      ...document,
      msgs: transactionMessages,
      memo: currentMemo,
      fee: {
        amount: [
          {
            amount: currentGasFee.toString(),
            denom: GasToken.denom,
          },
        ],
        gas: currentGasWanted.toString(),
      },
    };

    setDocument(updatedDocument);
    setTransactionData(mappedTransactionData(updatedDocument));
  };

  const changeMemo = (memo: string): void => {
    setMemo(memo);
  };

  const sendTransaction = async (): Promise<boolean> => {
    if (!isRequestedNetworkReady || approvalBlocked) {
      return false;
    }
    if (isErrorNetworkFee) {
      return false;
    }
    if (!document || !currentNetwork || !signingAccount || !wallet) {
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          {},
          requestData?.key,
        ),
      );
      return false;
    }

    // SessionAccount: apply the same spend/allow-path/expiry guard the Sign
    // flow enforces, right before signing+broadcasting. Without it the primary
    // DoContract path would build and broadcast (paying gas) txs the chain will
    // reject, and skip the client-side session protections entirely. Fail
    // closed on any evaluation error.
    if (isSessionAccount(signingAccount)) {
      let decision: SessionSigningGuardDecision;
      try {
        const sessionAddr = await signingAccount.getAddress(chain.bech32Prefix);
        const metadata = await sessionRepository.get(sessionAddr);
        const walletLocked = await walletService.isLocked();
        decision = evaluateSessionSigningGuard({
          currentAccount: signingAccount,
          sessionMetadata: metadata,
          walletLocked,
          nowSeconds: Math.floor(Date.now() / 1000),
          currentChainId: currentNetwork.chainId,
          decodedMessages: document.msgs as { type: string; value: any }[],
          txFee: {
            amount: document.fee.amount[0]?.amount ?? '0',
            denom: document.fee.amount[0]?.denom ?? GasToken.denom,
          },
        });
      } catch {
        decision = { ok: false, reason: 'session_metadata_missing' };
      }
      if (decision.ok === false) {
        setResponse(
          InjectionMessageInstance.failure(
            WalletResponseRejectType.TRANSACTION_REJECTED,
            { sessionGuardReason: decision.reason },
            requestData?.key,
          ),
        );
        return false;
      }
    }

    try {
      const walletInstance = wallet.clone();
      walletInstance.currentAccountId = signingAccount.id;
      const shouldBroadcastCommit = requestData?.data?.commit === true;

      const { signed } = await transactionService.createTransaction(
        walletInstance,
        signingAccount,
        document,
      );

      const hash = transactionService.createHash(signed);

      const response = await new Promise<
        BroadcastTxCommitResult | BroadcastTxSyncResult | TM2Error | null
      >((resolve) => {
        transactionService
          .sendTransaction(walletInstance, signingAccount, signed, shouldBroadcastCommit)
          .then((r) => {
            resolve(r);
          })
          .catch((error: TM2Error | Error) => {
            resolve(error);
          });

        const { rpcUrl: effectiveRpcUrl } = currentNetwork;
        checkHealth(effectiveRpcUrl, requestData?.key);
      });
      if (!response) {
        setResponse(
          InjectionMessageInstance.failure(
            WalletResponseFailureType.TRANSACTION_FAILED,
            {
              hash,
              error: null,
            },
            requestData?.key,
            requestData?.withNotification,
          ),
        );
        return true;
      }
      if (response instanceof TM2Error || response instanceof Error) {
        // Surface chain's diagnostic Log (TM2Error.log, present only on
        // TM2Error). toString() drops it, so callers (web Add Session Account)
        // can't tell apart auth.go vs handler.go vs ante.go rejections without
        // it. Forward as a separate data field so existing dapp consumers
        // ignore it harmlessly.
        const chainLog =
          response instanceof TM2Error
            ? (response as TM2Error & { log?: string }).log
            : undefined;
        setResponse(
          InjectionMessageInstance.failure(
            WalletResponseFailureType.TRANSACTION_FAILED,
            {
              hash,
              error: response?.toString(),
              log: chainLog,
            },
            requestData?.key,
            requestData?.withNotification,
          ),
        );
        return true;
      }

      setResponse(
        InjectionMessageInstance.success(
          WalletResponseSuccessType.TRANSACTION_SUCCESS,
          response,
          requestData?.key,
          requestData?.withNotification,
        ),
      );
      return true;
    } catch (e) {
      if (e instanceof Error) {
        const message = e.message;
        if (message.includes('Ledger')) {
          return false;
        }
      }
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.TRANSACTION_FAILED,
          {},
          requestData?.key,
          requestData?.withNotification,
        ),
      );
    }
    return false;
  };

  const onToggleTransactionData = (visibleTransactionInfo: boolean): void => {
    setVisibleTransactionInfo(visibleTransactionInfo);
  };

  const onClickConfirm = (): void => {
    if (
      !signingAccount ||
      isErrorNetworkFee ||
      requiresHoldConfirmation ||
      !isRequestedNetworkReady ||
      approvalBlocked
    ) {
      return;
    }

    if (isLedgerAccount(signingAccount)) {
      navigate(RoutePath.ApproveTransactionLoading, {
        state: {
          document,
          requestData,
        },
      });
      return;
    }

    setScreenState('LOADING');
    isAutoClosedResultRef.current = false;
    sendTransaction().finally(() => {
      setScreenState('RESULT');
    });
  };

  useEffect(() => {
    checkLockWallet();
  }, [walletService]);

  useEffect(() => {
    if (location.search) {
      initRequestData();
    }
  }, [location]);

  useEffect(() => {
    if (signingAccount && requestData && gnoProvider && isRequestedNetworkReady) {
      if (isAirgapAccount(signingAccount)) {
        navigate(RoutePath.ApproveSignFailed);
        return;
      }
      validate(signingAccount, requestData).then((validated) => {
        if (validated) {
          initFavicon();
          initTransactionData();

          getWalletFundingAddress(signingAccount, chain.bech32Prefix).then(initBalance);
        }
      });
    }
  }, [
    signingAccount,
    requestData,
    gnoProvider,
    isRequestedNetworkReady,
    transactionService,
    currentNetwork.chainId,
    currentNetwork.rpcUrl,
  ]);

  useEffect(() => {
    if (transactionMessages.length === 0) {
      return;
    }

    updateTransactionData();
  }, [
    memo,
    transactionMessages,
    useNetworkFeeReturn.currentGasInfo?.gasWanted,
    useNetworkFeeReturn.currentGasFeeRawAmount,
  ]);

  const onClickCancel = (): void => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(
        WalletResponseRejectType.TRANSACTION_REJECTED,
        {},
        requestData?.key,
      ),
    );
  };

  const onResponseSendTransaction = useCallback(() => {
    if (response) {
      chrome.runtime.sendMessage(response);
    }
  }, [response]);

  const onTimeoutSendTransaction = useCallback(() => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.NETWORK_TIMEOUT,
        {},
        requestData?.key,
      ),
    );
  }, [requestData]);

  const parsedSimulateErrors = useMemo(() => {
    if (!useNetworkFeeReturn.isSimulateError || useNetworkFeeReturn.isLoading) {
      return { globalErrorMessage: null, messageErrors: [] };
    }
    const rawMessage = useNetworkFeeReturn.currentGasInfo?.simulateErrorMessage || null;
    const parsed = parseSimulateErrors(rawMessage, transactionMessages);

    if (!parsed.globalErrorMessage) {
      parsed.globalErrorMessage = 'Failed to simulate transaction';
    }

    return parsed;
  }, [
    useNetworkFeeReturn.isSimulateError,
    useNetworkFeeReturn.isLoading,
    useNetworkFeeReturn.currentGasInfo?.simulateErrorMessage,
    transactionMessages,
  ]);

  const combinedMessageErrors = useMemo(() => {
    const maxLen = Math.max(
      argumentValidationErrors.messageErrors.length,
      parsedSimulateErrors.messageErrors.length,
    );
    const result: (string | undefined)[] = [];
    for (let i = 0; i < maxLen; i++) {
      result.push(
        argumentValidationErrors.messageErrors[i] || parsedSimulateErrors.messageErrors[i],
      );
    }
    return result;
  }, [argumentValidationErrors, parsedSimulateErrors]);

  const onClickViewHistoryResult = useCallback(() => {
    if (response) {
      chrome.runtime.sendMessage(response);
      navigate(RoutePath.History);
    } else {
      onTimeoutSendTransaction();
      navigate(RoutePath.History);
    }
  }, [response, onTimeoutSendTransaction, navigate]);

  const onClickViewGnoscanResult = useCallback(() => {
    if (!response || response.status !== 'success') {
      return;
    }

    const txHash =
      response?.data?.hash ||
      response?.data?.txhash ||
      response?.data?.txHash ||
      response?.data?.transactionHash;

    if (!txHash || typeof txHash !== 'string') {
      return;
    }

    openScannerLink('/transactions/details', { txhash: txHash });
  }, [response, openScannerLink]);

  const onClickCloseResult = useCallback(async () => {
    if (response) {
      // Await delivery before closing. Otherwise window.close() can sever the
      // message channel mid-flight, and the background's onRemoved listener
      // replies to the dapp with TRANSACTION_REJECTED even though the tx
      // succeeded.
      try {
        await chrome.runtime.sendMessage(response);
      } catch {
        // Best-effort: if the channel is already gone, nothing to do.
      }
    } else {
      onTimeoutSendTransaction();
    }

    window.close();
  }, [response, onTimeoutSendTransaction]);

  const resultStatus = useMemo<'SUCCESS' | 'FAILED'>(() => {
    if (response?.status === 'success') {
      return 'SUCCESS';
    }

    return 'FAILED';
  }, [response?.status]);

  const resultErrorMessage = useMemo<string | null>(() => {
    const error = response?.data?.error;

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error?.message === 'string') {
      return error.message;
    }

    return null;
  }, [response]);

  useEffect(() => {
    if (screenState !== 'RESULT') {
      return;
    }

    if (isVisibleResult) {
      return;
    }

    if (isAutoClosedResultRef.current) {
      return;
    }

    isAutoClosedResultRef.current = true;
    onClickCloseResult();
  }, [screenState, isVisibleResult, onClickCloseResult]);

  if (screenState === 'LOADING') {
    return <ApproveTransactionLoading />;
  }

  if (screenState === 'RESULT') {
    return (
      <ApproveTransactionResult
        status={resultStatus}
        errorMessage={resultErrorMessage}
        onClickViewHistory={onClickViewHistoryResult}
        onClickViewGnoscan={onClickViewGnoscanResult}
        onClickClose={onClickCloseResult}
      />
    );
  }
  return (
    <ApproveTransaction
      title='Approve Transaction'
      domain={hostname}
      contracts={transactionData?.contracts || []}
      memo={memo}
      hasMemo={hasMemo}
      loading={transactionData === undefined || !isRequestedNetworkReady}
      processing={false}
      done={false}
      logo={favicon}
      currentBalance={currentBalance}
      maxDepositAmount={maxDepositAmount}
      isErrorNetworkFee={isErrorNetworkFee || !networkFee}
      networkFee={displayNetworkFee}
      useNetworkFeeReturn={useNetworkFeeReturn}
      transactionMessages={transactionMessages}
      changeTransactionMessages={setTransactionMessages}
      changeMemo={changeMemo}
      onClickConfirm={onClickConfirm}
      onClickCancel={onClickCancel}
      onResponse={onResponseSendTransaction}
      onTimeout={onTimeoutSendTransaction}
      onToggleTransactionData={onToggleTransactionData}
      openScannerLink={openScannerLink}
      opened={visibleTransactionInfo}
      argumentInfos={argumentInfos}
      transactionData={JSON.stringify(document, null, 2)}
      requiresHoldConfirmation={
        requiresHoldConfirmation || approvalBlocked
      }
      onFinishHold={handleFinishHold}
      simulateErrorBannerMessage={parsedSimulateErrors.globalErrorMessage}
      sessionGuardBannerMessage={
        sessionAdminNetworkUnsupportedMessage ||
        signingAccountMissingMessage ||
        sessionAdminSigningAccountUnsupportedMessage
      }
      messageErrors={combinedMessageErrors}
      hasArgumentValidationError={hasArgumentValidationError}
    />
  );
};

export default ApproveTransactionContainer;
