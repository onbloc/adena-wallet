/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  defaultAddressPrefix,
  TM2Error,
} from '@gnolang/tm2-js-client';
import { Account, Document, isAirgapAccount, isLedgerAccount } from 'adena-module';
import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import { GasToken, GNOT_TOKEN } from '@common/constants/token.constant';
import { mappedTransactionMessages } from '@common/mapper/transaction-mapper';
import { parseTokenAmount } from '@common/utils/amount-utils';
import {
  createFaviconByHostname,
  decodeParameter,
  parseParameters,
} from '@common/utils/client-utils';
import { fetchHealth } from '@common/utils/fetch-utils';
import { validateInjectionDataWithAddress } from '@common/validation/validation-transaction';
import { ApproveTransaction } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';
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

interface TransactionData {
  messages: readonly any[];
  contracts: { type: string; function: string; value: any }[];
  gasWanted: string;
  gasFee: string;
  memo: string;
  document: Document;
}

function makeDefaultNetworkInfo(chainId: string, rpcUrl: string): NetworkMetainfo {
  return {
    addressPrefix: defaultAddressPrefix,
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

const ApproveTransactionContainer: React.FC = () => {
  const { wallet } = useWalletContext();
  const nomarlNavigate = useNavigate();
  const { navigate } = useAppNavigate();
  const { gnoProvider, changeNetwork } = useWalletContext();
  const { walletService, transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [transactionData, setTransactionData] = useState<TransactionData>();
  const [hostname, setHostname] = useState('');
  const location = useLocation();
  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);
  const [document, setDocument] = useState<Document>();
  const { currentNetwork: currentWalletNetwork } = useNetwork();
  const [currentBalance, setCurrentBalance] = useState(0);
  const [processType, setProcessType] = useState<'INIT' | 'PROCESSING' | 'DONE'>('INIT');
  const [response, setResponse] = useState<InjectionMessage | null>(null);
  const [memo, setMemo] = useState('');
  const [transactionMessages, setTransactionMessages] = useState<ContractMessage[]>([]);
  const { openScannerLink } = useLink();
  const useNetworkFeeReturn = useNetworkFee(document, true);
  const [requiresHoldConfirmation, setRequiresHoldConfirmation] = useState(false);

  const networkFee = useNetworkFeeReturn.networkFee;

  const currentNetwork: NetworkMetainfo = useMemo(() => {
    const networkInfo = requestData?.data?.networkInfo;
    if (!!networkInfo?.chainId && !!networkInfo?.rpcUrl) {
      return makeDefaultNetworkInfo(networkInfo.chainId, networkInfo.rpcUrl);
    }

    return currentWalletNetwork;
  }, [currentWalletNetwork, requestData]);

  useEffect(() => {
    changeNetwork(currentNetwork);
  }, [currentNetwork.chainId]);

  const processing = useMemo(() => processType !== 'INIT', [processType]);

  const done = useMemo(() => processType === 'DONE', [processType]);

  const hasMemo = useMemo(() => {
    if (!requestData?.data?.memo) {
      return false;
    }
    return true;
  }, [requestData?.data?.memo]);

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

  const argumentInfos: GnoArgumentInfo[] = useMemo(() => {
    return requestData?.data?.arguments || [];
  }, [requestData?.data?.arguments]);

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
    const address = await currentAccount.getAddress('g');
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
      .catch((error) => {
        console.log(error);
      });
  };

  const initTransactionData = async (): Promise<boolean> => {
    if (!currentNetwork || !currentAccount || !requestData) {
      return false;
    }
    try {
      const document = await transactionService.createDocument(
        currentAccount,
        currentNetwork.networkId,
        requestData?.data?.messages,
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
        checkHealth(currentNetwork.rpcUrl, requestData.key);
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
    setRequiresHoldConfirmation(true);
  };

  const changeMemo = (memo: string): void => {
    setMemo(memo);
  };

  const sendTransaction = async (): Promise<boolean> => {
    if (isErrorNetworkFee) {
      return false;
    }
    if (!document || !currentNetwork || !currentAccount || !wallet) {
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          {},
          requestData?.key,
        ),
      );
      return false;
    }

    try {
      setProcessType('PROCESSING');

      const walletInstance = wallet.clone();
      walletInstance.currentAccountId = currentAccount.id;

      const { signed } = await transactionService.createTransaction(
        walletInstance,
        currentAccount,
        document,
      );

      const hash = transactionService.createHash(signed);

      const response = await new Promise<
        BroadcastTxCommitResult | BroadcastTxSyncResult | TM2Error | null
      >((resolve) => {
        transactionService
          .sendTransaction(walletInstance, currentAccount, signed, false)
          .then(resolve)
          .catch((error: TM2Error | Error) => {
            resolve(error);
          });

        checkHealth(currentNetwork.rpcUrl, requestData?.key);
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
        setResponse(
          InjectionMessageInstance.failure(
            WalletResponseFailureType.TRANSACTION_FAILED,
            {
              hash,
              error: response?.toString(),
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
    if (!currentAccount || isErrorNetworkFee || requiresHoldConfirmation) {
      return;
    }

    if (isLedgerAccount(currentAccount)) {
      navigate(RoutePath.ApproveTransactionLoading, {
        state: {
          document,
          requestData,
        },
      });
      return;
    }
    sendTransaction().finally(() => {
      setProcessType('DONE');
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
    if (currentAccount && requestData && gnoProvider) {
      if (isAirgapAccount(currentAccount)) {
        navigate(RoutePath.ApproveSignFailed);
        return;
      }
      validate(currentAccount, requestData).then((validated) => {
        if (validated) {
          initFavicon();
          initTransactionData();

          currentAccount.getAddress(currentNetwork.addressPrefix).then(initBalance);
        }
      });
    }
  }, [currentAccount, requestData, gnoProvider]);

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

  return (
    <ApproveTransaction
      title='Approve Transaction'
      domain={hostname}
      contracts={transactionData?.contracts || []}
      memo={memo}
      hasMemo={hasMemo}
      loading={transactionData === undefined}
      processing={processing}
      done={done}
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
      requiresHoldConfirmation={requiresHoldConfirmation}
      onFinishHold={handleFinishHold}
    />
  );
};

export default ApproveTransactionContainer;
