/* eslint-disable @typescript-eslint/no-explicit-any */
import { defaultAddressPrefix } from '@gnolang/tm2-js-client';
import { Account, isAirgapAccount, isMultisigAccount, MultisigConfig } from 'adena-module';
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
import { ContractMessage, MultisigTransactionDocument, Signature } from '@inject/types';
import { NetworkMetainfo, RoutePath } from '@types';
import { BroadcastMultisigTransaction } from '@components/molecules/broadcast-multisig-transaction';
import { SCANNER_URL } from '@common/constants/resource.constant';
import { makeQueryString } from '@common/utils/string-utils';
import { validateInjectionDataWithAddress } from '@common/validation/validation-transaction';

interface BroadcastMultisigTransactionRequestData {
  multisigDocument: MultisigTransactionDocument;
  multisigSignatures?: Signature[];
}

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
 * Map MultisigTransactionDocument to TransactionData for UI
 */
function mappedTransactionData(txDocument: MultisigTransactionDocument): TransactionData {
  const { tx } = txDocument;

  return {
    messages: tx.msgs,
    contracts: tx.msgs.map((message) => {
      return {
        type: message?.type || '',
        function: message?.type === '/bank.MsgSend' ? 'Transfer' : message?.value?.func || '',
        value: message?.value || '',
      };
    }),
    gasWanted: tx.fee.gas_wanted,
    gasFee: tx.fee.gas_fee,
    memo: tx.memo || '',
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
  const { walletService, multisigService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const location = useLocation();
  const { currentNetwork: currentWalletNetwork, scannerParameters } = useNetwork();
  const { openScannerLink } = useLink();

  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [transactionData, setTransactionData] = useState<TransactionData>();
  const [multisigDocument, setMultisigDocument] = useState<MultisigTransactionDocument>();
  const [multisigSignatures, setMultisigSignatures] = useState<Signature[]>([]);
  const [transactionMessages, setTransactionMessages] = useState<ContractMessage[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [memo, setMemo] = useState('');

  const [hostname, setHostname] = useState('');
  const [favicon, setFavicon] = useState<any>(null);
  const [processType, setProcessType] = useState<'INIT' | 'PROCESSING' | 'DONE'>('INIT');
  const [response, setResponse] = useState<InjectionMessage | null>(null);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);

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

    // Parse amount string with denomination into structured format
    // Example: "6113ugnot" -> { amount: "0.006113", denom: "GNOT" }
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
    const accumulatedAmount = multisigDocument?.tx?.msgs.reduce((acc, msg) => {
      const amountStr = msg.value?.send || msg.value?.amount || msg.value?.max_deposit;
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

  const isNetworkFeeLoading = useMemo(() => {
    return isBalanceLoading;
  }, [isBalanceLoading]);

  const isErrorNetworkFee = useMemo(() => {
    if (!displayNetworkFee.amount) {
      return false;
    }

    if (isBalanceLoading) {
      return false;
    }

    if (currentBalance === 0) {
      return true;
    }

    const resultConsumedAmount = BigNumber(consumedTokenAmount).plus(displayNetworkFee.amount);

    return BigNumber(currentBalance)
      .shiftedBy(GasToken.decimals * -1)
      .isLessThan(resultConsumedAmount);
  }, [displayNetworkFee.amount, currentBalance, consumedTokenAmount, isBalanceLoading]);

  const argumentInfos: GnoArgumentInfo[] = useMemo(() => {
    return requestData?.data?.arguments || [];
  }, [requestData?.data?.arguments]);

  const multisigConfig: MultisigConfig | null = useMemo(() => {
    if (!currentAccount) return null;

    return isMultisigAccount(currentAccount) ? currentAccount.multisigConfig : null;
  }, [currentAccount]);

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

    setIsBalanceLoading(true);
    gnoProvider
      .getBalance(address, GNOT_TOKEN.denom)
      .then((balance) => {
        setCurrentBalance(balance);
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setIsBalanceLoading(false);
      });
  };

  const initMultisigDocument = async (): Promise<boolean> => {
    if (!currentNetwork || !currentAccount || !requestData) {
      return false;
    }
    try {
      const data = requestData?.data as BroadcastMultisigTransactionRequestData;
      const { multisigDocument, multisigSignatures = [] } = data;

      if (!data || !multisigDocument.tx) {
        throw new Error('Multisig transaction document not found');
      }

      setMultisigDocument(multisigDocument);
      setMultisigSignatures(multisigSignatures);
      setTransactionData(mappedTransactionData(multisigDocument));
      setHostname(requestData?.hostname ?? '');
      setMemo(multisigDocument.tx.memo);
      setTransactionMessages(mappedTransactionMessages(data.multisigDocument.tx.msgs));

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

  const validate = async (
    currentAccount: Account,
    requestData: InjectionMessage,
  ): Promise<boolean> => {
    if (!isMultisigAccount(currentAccount)) {
      return false;
    }

    const validationMessage = validateInjectionDataWithAddress(
      requestData,
      await currentAccount.getAddress(defaultAddressPrefix),
      false,
    );
    if (validationMessage) {
      chrome.runtime.sendMessage(validationMessage);
      return false;
    }
    return true;
  };

  const createTxExplorerUrl = (txHash: string): string => {
    const scannerUrl = currentNetwork.linkUrl || SCANNER_URL;
    const params = {
      ...(scannerParameters || {}),
      txhash: txHash,
    };

    return `${scannerUrl}/transactions/details?${makeQueryString(params)}`;
  };

  const broadcastMultisigTransaction = async (): Promise<boolean> => {
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

      const combinedTx = await multisigService.combineMultisigSignatures(
        currentAccount,
        multisigDocument,
        multisigSignatures,
      );

      const broadcastResult = await multisigService.broadcastTxCommit(combinedTx.tx);

      const txExplorerUrl = createTxExplorerUrl(broadcastResult.hash);

      setResponse(
        InjectionMessageInstance.success(
          WalletResponseSuccessType.TRANSACTION_SUCCESS,
          { broadcastResult, txExplorerUrl },
          requestData?.key,
          requestData?.withNotification,
        ),
      );

      return true;
    } catch (e) {
      handleBroadcastError(e);
      return false;
    } finally {
      setProcessType('DONE');
    }
  };

  const handleBroadcastError = (e: unknown): void => {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';

    setResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.TRANSACTION_FAILED,
        { error: { message: errorMessage } },
        requestData?.key,
        requestData?.withNotification,
      ),
    );
  };

  const onToggleTransactionData = (visibleTransactionInfo: boolean): void => {
    setVisibleTransactionInfo(visibleTransactionInfo);
  };

  const onClickConfirm = (): void => {
    if (isErrorNetworkFee) {
      return;
    }
    broadcastMultisigTransaction().finally(() => {
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
      if (!isMultisigAccount(currentAccount)) {
        navigate(RoutePath.ApproveSignFailed);
        return;
      }
      validate(currentAccount, requestData).then((validated) => {
        if (validated) {
          initFavicon();
          initMultisigDocument();
        }
      });
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
      title='Broadcast Transaction'
      logo={favicon}
      domain={hostname}
      contracts={transactionData?.contracts || []}
      memo={memo}
      hasMemo={hasMemo}
      currentBalance={currentBalance}
      isErrorNetworkFee={isErrorNetworkFee}
      isNetworkFeeLoading={isNetworkFeeLoading}
      networkFee={displayNetworkFee}
      transactionData={JSON.stringify(multisigDocument, null, 2)}
      opened={visibleTransactionInfo}
      argumentInfos={argumentInfos}
      processing={processing}
      done={done}
      transactionMessages={transactionMessages}
      multisigConfig={multisigConfig}
      signatures={multisigSignatures}
      currentAccount={currentAccount}
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
