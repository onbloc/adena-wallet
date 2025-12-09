/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  defaultAddressPrefix,
  TM2Error,
} from '@gnolang/tm2-js-client';
import {
  Document,
  fromBase64,
  isAirgapAccount,
  isMultisigAccount,
  publicKeyToAddress,
} from 'adena-module';
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
import { CommonFullContentLayout } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage, MultisigDocument } from '@inject/types';
import { NetworkMetainfo, RoutePath } from '@types';
import { BroadcastMultisigTransaction } from '@components/molecules/broadcast-multisig-transaction';

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

function mappedTransactionData(multisigDocument: MultisigDocument): TransactionData {
  const { document } = multisigDocument;
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

const BroadcastMultisigTransactionContainer: React.FC = () => {
  const normalNavigate = useNavigate();
  const { navigate } = useAppNavigate();
  const { gnoProvider, changeNetwork, wallet } = useWalletContext();
  const { walletService, multisigService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [transactionData, setTransactionData] = useState<TransactionData>();
  const [hostname, setHostname] = useState('');
  const location = useLocation();
  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);
  const [multisigDocument, setMultisigDocument] = useState<MultisigDocument>();
  const { currentNetwork: currentWalletNetwork } = useNetwork();
  const [currentBalance, setCurrentBalance] = useState(0);
  const [processType, setProcessType] = useState<'INIT' | 'PROCESSING' | 'DONE'>('INIT');
  const [response, setResponse] = useState<InjectionMessage | null>(null);
  const [memo, setMemo] = useState('');
  const [transactionMessages, setTransactionMessages] = useState<ContractMessage[]>([]);
  const { openScannerLink } = useLink();

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
    if (!multisigDocument?.document?.fee?.amount?.[0]) {
      return {
        amount: '',
        denom: '',
      };
    }

    const feeAmount = multisigDocument.document.fee.amount[0];
    const amount = BigNumber(feeAmount.amount)
      .shiftedBy(GasToken.decimals * -1)
      .toString();

    return {
      amount,
      denom: GasToken.symbol,
    };
  }, [multisigDocument]);

  const consumedTokenAmount = useMemo(() => {
    const accumulatedAmount = multisigDocument?.document?.msgs.reduce((acc, msg) => {
      const messageValue = msg.value;
      const amountStr = messageValue?.amount || messageValue?.max_deposit;
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
  }, [multisigDocument]);

  const isErrorNetworkFee = useMemo(() => {
    if (!displayNetworkFee.amount) {
      return false;
    }

    if (currentBalance === 0) {
      return true;
    }

    const resultConsumedAmount = BigNumber(consumedTokenAmount).plus(displayNetworkFee.amount);

    return BigNumber(currentBalance)
      .shiftedBy(GasToken.decimals * -1)
      .isLessThan(resultConsumedAmount);
  }, [displayNetworkFee.amount, currentBalance, consumedTokenAmount]);

  const argumentInfos: GnoArgumentInfo[] = useMemo(() => {
    return requestData?.data?.arguments || [];
  }, [requestData?.data?.arguments]);

  const signatures = useMemo(() => {
    return multisigDocument?.signatures || [];
  }, [multisigDocument?.signatures]);

  const multisigConfig = useMemo(() => {
    return multisigDocument?.multisigConfig || null;
  }, [multisigDocument?.multisigConfig]);

  const checkLockWallet = (): void => {
    walletService
      .isLocked()
      .then((locked) => locked && normalNavigate(RoutePath.ApproveLogin + location.search));
  };

  const initRequestData = (): void => {
    const data = parseParameters(location.search);
    const parsedData = decodeParameter(data['data']);
    setRequestData({ ...parsedData, hostname: data['hostname'] });
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

  console.log(requestData, 'requestDatarequestData');

  const initMultisigDocument = async (): Promise<boolean> => {
    if (!currentNetwork || !currentAccount || !requestData) {
      return false;
    }
    try {
      // const document = requestData?.data?.document as MultisigDocument;
      const document = requestData?.data as MultisigDocument;

      if (!document) {
        throw new Error('Multisig document not found');
      }

      setMultisigDocument(document);
      setTransactionData(mappedTransactionData(document));
      setHostname(requestData?.hostname ?? '');
      setMemo(document.document.memo);
      setTransactionMessages(mappedTransactionMessages(document.document.msgs));
      return true;
    } catch (e) {
      const error: any = e;
      if (error?.message === 'Connection Error') {
        checkHealth(currentNetwork.rpcUrl, requestData.key);
      }
      chrome.runtime.sendMessage(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          { error: { message: error?.message } },
          requestData?.key,
        ),
      );
    }
    return false;
  };

  const changeMemo = (memo: string): void => {
    setMemo(memo);
  };

  const broadcastTransaction = async (): Promise<boolean> => {
    if (isErrorNetworkFee) {
      return false;
    }
    if (!multisigDocument || !currentNetwork || !currentAccount || !wallet) {
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          {},
          requestData?.key,
        ),
      );
      return false;
    }

    console.log(isMultisigAccount(currentAccount), '?');
    if (!isMultisigAccount(currentAccount)) {
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

      // 직접 await로 받기
      let broadcastResult: { hash: string; height?: string } | null = null;
      let broadcastError: TM2Error | Error | null = null;

      try {
        broadcastResult = await multisigService.broadcastMultisigTransaction(
          currentAccount,
          multisigDocument,
          true,
        );
      } catch (error) {
        broadcastError = error as TM2Error | Error;
      }

      // Health check (timeout)
      // const healthCheckTimeout = checkHealth(currentNetwork.rpcUrl, requestData?.key);

      // if (broadcastError) {
      //   clearTimeout(healthCheckTimeout);
      //   setResponse(
      //     InjectionMessageInstance.failure(
      //       WalletResponseFailureType.TRANSACTION_FAILED,
      //       {
      //         error: broadcastError?.toString(),
      //       },
      //       requestData?.key,
      //       requestData?.withNotification,
      //     ),
      //   );
      //   return true;
      // }

      // if (!broadcastResult) {
      //   clearTimeout(healthCheckTimeout);
      //   setResponse(
      //     InjectionMessageInstance.failure(
      //       WalletResponseFailureType.TRANSACTION_FAILED,
      //       {
      //         error: null,
      //       },
      //       requestData?.key,
      //       requestData?.withNotification,
      //     ),
      //   );
      //   return true;
      // }

      // clearTimeout(healthCheckTimeout);
      // setResponse(
      //   InjectionMessageInstance.success(
      //     WalletResponseSuccessType.TRANSACTION_SUCCESS,
      //     {
      //       hash: broadcastResult.hash,
      //       height: broadcastResult.height,
      //     },
      //     requestData?.key,
      //     requestData?.withNotification,
      //   ),
      // );
      // return true;
    } catch (e) {
      console.error('Broadcast transaction error:', e);
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.TRANSACTION_FAILED,
          { error: e instanceof Error ? e.message : 'Unknown error' },
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
    if (isErrorNetworkFee) {
      return;
    }
    broadcastTransaction().finally(() => {
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
      initFavicon();
      initMultisigDocument();
      currentAccount.getAddress(currentNetwork.addressPrefix).then(initBalance);
    }
  }, [currentAccount, requestData, gnoProvider]);

  const onClickCancel = (): void => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(
        WalletResponseRejectType.TRANSACTION_REJECTED,
        {},
        requestData?.key,
      ),
    );
  };

  const onResponseBroadcastTransaction = useCallback(() => {
    if (response) {
      chrome.runtime.sendMessage(response);
    }
  }, [response]);

  const onTimeoutBroadcastTransaction = useCallback(() => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.NETWORK_TIMEOUT,
        {},
        requestData?.key,
      ),
    );
  }, [requestData]);

  console.log(transactionData, 'transactionData');
  console.log(multisigDocument, 'multisigDocument');

  return (
    <BroadcastMultisigTransaction
      loading={transactionData === undefined}
      title='Broadcast Multisig Transaction'
      logo={favicon}
      domain={hostname}
      contracts={transactionData?.contracts || []}
      memo={memo}
      hasMemo={hasMemo}
      currentBalance={currentBalance}
      isErrorNetworkFee={isErrorNetworkFee}
      networkFee={displayNetworkFee}
      transactionData={JSON.stringify(multisigDocument, null, 2)}
      opened={visibleTransactionInfo}
      argumentInfos={argumentInfos}
      processing={processing}
      done={done}
      transactionMessages={transactionMessages}
      multisigConfig={multisigConfig}
      signatures={signatures}
      changeMemo={changeMemo}
      openScannerLink={openScannerLink}
      onToggleTransactionData={onToggleTransactionData}
      onResponse={onResponseBroadcastTransaction}
      onTimeout={onTimeoutBroadcastTransaction}
      onClickConfirm={onClickConfirm}
      onClickCancel={onClickCancel}
    />
  );
};

export default BroadcastMultisigTransactionContainer;
