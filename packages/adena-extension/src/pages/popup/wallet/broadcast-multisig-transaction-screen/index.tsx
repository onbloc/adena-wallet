/* eslint-disable @typescript-eslint/no-explicit-any */
import { defaultAddressPrefix, TM2Error } from '@gnolang/tm2-js-client';
import { isAirgapAccount, isMultisigAccount } from 'adena-module';
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
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage, MultisigTransactionDocument } from '@inject/types';
import { NetworkMetainfo, RoutePath } from '@types';
import { BroadcastMultisigTransaction } from '@components/molecules/broadcast-multisig-transaction';

interface TransactionData {
  messages: readonly any[];
  contracts: { type: string; function: string; value: any }[];
  gasWanted: string;
  gasFee: string;
  memo: string;
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

/**
 * Convert Protobuf message (@type) to Amino message (type/value)
 */
function convertMessageToAmino(msg: any): { type: string; value: any } {
  if (msg.type && msg.value) {
    return msg;
  }
  const { '@type': type, ...value } = msg;
  return { type, value };
}

/**
 * Map MultisigTransactionDocument to TransactionData for UI
 */
function mappedTransactionData(doc: MultisigTransactionDocument): TransactionData {
  const messages = doc.tx.msg.map(convertMessageToAmino);

  return {
    messages,
    contracts: messages.map((message) => ({
      type: message?.type || '',
      function: message?.type === '/bank.MsgSend' ? 'Transfer' : message?.value?.func || '',
      value: message?.value || '',
    })),
    gasWanted: doc.tx.fee.gas_wanted,
    gasFee: doc.tx.fee.gas_fee,
    memo: doc.tx.memo || '',
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
  const { wallet, gnoProvider, changeNetwork } = useWalletContext();
  const { walletService, multisigService, transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [transactionData, setTransactionData] = useState<TransactionData>();
  const [hostname, setHostname] = useState('');
  const location = useLocation();
  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);
  const [multisigDocument, setMultisigDocument] = useState<MultisigTransactionDocument>();
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
    return !!requestData?.data?.memo;
  }, [requestData?.data?.memo]);

  const displayNetworkFee = useMemo(() => {
    if (!multisigDocument?.tx?.fee?.gas_fee) {
      return {
        amount: '',
        denom: '',
      };
    }

    // Parse "6113ugnot" -> { amount: "0.006113", denom: "GNOT" }
    const gasFeeMatch = multisigDocument.tx.fee.gas_fee.match(/^(\d+)(\w+)$/);
    if (!gasFeeMatch) {
      return {
        amount: '',
        denom: '',
      };
    }

    const amount = BigNumber(gasFeeMatch[1])
      .shiftedBy(GasToken.decimals * -1)
      .toString();

    return {
      amount,
      denom: GasToken.symbol,
    };
  }, [multisigDocument]);

  const consumedTokenAmount = useMemo(() => {
    const accumulatedAmount = multisigDocument?.tx?.msg.reduce((acc, msg) => {
      const amountStr = msg.send || msg.amount || msg.max_deposit;
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
    return multisigDocument?.multisigSignatures || [];
  }, [multisigDocument?.multisigSignatures]);

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

  const initMultisigDocument = async (): Promise<boolean> => {
    if (!currentNetwork || !currentAccount || !requestData) {
      return false;
    }
    try {
      // Receive MultisigTransactionDocument (new format)
      const document = requestData?.data as MultisigTransactionDocument;

      if (!document || !document.tx) {
        throw new Error('Multisig transaction document not found');
      }

      setMultisigDocument(document);
      setTransactionData(mappedTransactionData(document));
      setHostname(requestData?.hostname ?? '');
      setMemo(document.tx.memo);

      // Convert messages for display
      const aminoMessages = document.tx.msg.map(convertMessageToAmino);
      setTransactionMessages(mappedTransactionMessages(aminoMessages));

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

    if (!isMultisigAccount(currentAccount)) {
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          { error: { message: 'Current account is not a multisig account' } },
          requestData?.key,
        ),
      );
      return false;
    }

    try {
      setProcessType('PROCESSING');

      // Health check timeout
      const healthCheckTimeout = checkHealth(currentNetwork.rpcUrl, requestData?.key);

      let broadcastResult: { tx: any; txBytes: Uint8Array; txBase64: string } | null = null;
      let broadcastError: TM2Error | Error | null = null;

      try {
        const walletInstance = wallet.clone();

        const prepared = await multisigService.prepareMultisigTransaction(
          currentAccount,
          multisigDocument!,
        );

        const result = await multisigService.broadcastTxCommit(prepared.tx);
        console.log(result, 'result!!!!!!!!!!!!!!');
        // const preparedTx = await multisigService.broadcastMultisigTransaction3(
        //   currentAccount,
        //   multisigDocument,
        //   true,
        // );

        // const broadcastResponse = await transactionService
        //   .sendTransaction(walletInstance, currentAccount, prepared.tx)
        //   .catch((e) => {
        //     console.error(e, '왜 안되니?');
        //     return null;
        //   });

        // console.log('Transaction broadcast result:', broadcastResponse);
      } catch (error) {
        broadcastError = error as TM2Error | Error;
      }

      clearTimeout(healthCheckTimeout);

      // if (broadcastError) {
      //   setResponse(
      //     InjectionMessageInstance.failure(
      //       WalletResponseFailureType.TRANSACTION_FAILED,
      //       {
      //         error: { message: broadcastError.toString() },
      //       },
      //       requestData?.key,
      //       requestData?.withNotification,
      //     ),
      //   );
      //   return false;
      // }

      // if (!broadcastResult) {
      //   setResponse(
      //     InjectionMessageInstance.failure(
      //       WalletResponseFailureType.TRANSACTION_FAILED,
      //       {
      //         error: { message: 'No broadcast result' },
      //       },
      //       requestData?.key,
      //       requestData?.withNotification,
      //     ),
      //   );
      //   return false;
      // }

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

      return true;
    } catch (e) {
      console.error('Broadcast transaction error:', e);
      // setResponse(
      //   InjectionMessageInstance.failure(
      //     WalletResponseFailureType.TRANSACTION_FAILED,
      //     { error: { message: e instanceof Error ? e.message : 'Unknown error' } },
      //     requestData?.key,
      //     requestData?.withNotification,
      //   ),
      // );
      return false;
    }
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
