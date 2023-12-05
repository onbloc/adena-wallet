import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ApproveTransaction from '@components/approve/approve-transaction/approve-transaction';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@hooks/use-current-account';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import {
  createFaviconByHostname,
  decodeParameter,
  fetchHealth,
  parseParmeters,
} from '@common/utils/client-utils';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { StdSignDoc, Account, isLedgerAccount, AminoMsg } from 'adena-module';
import { RoutePath } from '@router/path';
import { validateInjectionData } from '@inject/message/methods';
import BigNumber from 'bignumber.js';
import { useNetwork } from '@hooks/use-network';
import { TM2Error } from '@gnolang/tm2-js-client';

function mappedTransactionData(document: StdSignDoc): {
  messages: readonly AminoMsg[];
  contracts: { type: string; function: any; value: any }[];
  gasWanted: string;
  gasFee: string;
  document: StdSignDoc;
} {
  return {
    messages: document.msgs,
    contracts: document.msgs.map((message) => {
      return {
        type: message?.type || '',
        function: message?.type === '/bank.MsgSend' ? 'Transfer' : message?.value?.func || '',
        value: message?.value || '',
      };
    }),
    gasWanted: document.fee.gas,
    gasFee: `${document.fee.amount[0].amount}${document.fee.amount[0].denom}`,
    document,
  };
}

const checkHealth = (rpcUrl: string, requestKey?: string): NodeJS.Timeout =>
  setTimeout(async () => {
    const { healthy } = await fetchHealth(rpcUrl);
    if (healthy === false) {
      chrome.runtime.sendMessage(
        InjectionMessageInstance.failure('NETWORK_TIMEOUT', {}, requestKey),
      );
      return;
    }
  }, 5000);

const DEFAULT_DENOM = 'GNOT';

const ApproveTransactionContainer: React.FC = () => {
  const navigate = useNavigate();
  const { gnoProvider } = useWalletContext();
  const { walletService, transactionService } = useAdenaContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const [transactionData, setTrasactionData] = useState<{ [key in string]: any } | undefined>(
    undefined,
  );
  const [hostname, setHostname] = useState('');
  const location = useLocation();
  const [requestData, setReqeustData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);
  const [document, setDocument] = useState<StdSignDoc>();
  const { currentNetwork } = useNetwork();
  const [currentBalance, setCurrentBalance] = useState(0);
  const [processType, setProcessType] = useState<'INIT' | 'PROCESSING' | 'DONE'>('INIT');
  const [response, setResponse] = useState<InjectionMessage | null>(null);

  const processing = useMemo(() => processType !== 'INIT', [processType]);

  const done = useMemo(() => processType === 'DONE', [processType]);

  const networkFee = useMemo(() => {
    if (!document || document.fee.amount.length === 0) {
      return {
        amount: '1',
        denom: DEFAULT_DENOM,
      };
    }
    const networkFeeAmount = document.fee.amount[0].amount;
    const networkFeeAmountOfGnot = BigNumber(networkFeeAmount).shiftedBy(-6).toString();
    return {
      amount: networkFeeAmountOfGnot,
      denom: DEFAULT_DENOM,
    };
  }, [document]);

  const isErrorNetworkFee = useMemo(() => {
    return BigNumber(currentBalance).shiftedBy(-6).isLessThan(networkFee.amount);
  }, [currentBalance, networkFee]);

  const checkLockWallet = (): void => {
    walletService
      .isLocked()
      .then((locked) => locked && navigate(RoutePath.ApproveLogin + location.search));
  };

  const initRequestData = (): void => {
    const data = parseParmeters(location.search);
    const parsedData = decodeParameter(data['data']);
    setReqeustData({ ...parsedData, hostname: data['hostname'] });
  };

  const validate = (currentAccount: Account, requestData: InjectionMessage): boolean => {
    const validationMessage = validateInjectionData(currentAccount.getAddress('g'), requestData);
    if (validationMessage) {
      chrome.runtime.sendMessage(validationMessage);
      return false;
    }
    return true;
  };

  const initFavicon = async (): Promise<void> => {
    const faviconData = await createFaviconByHostname(requestData?.hostname ?? '');
    setFavicon(faviconData);
  };

  const initBalance = useCallback(() => {
    if (!currentAddress || !gnoProvider) {
      return;
    }
    gnoProvider.getBalance(currentAddress, 'ugnot').then(setCurrentBalance);
  }, [currentAddress, gnoProvider]);

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
      setTrasactionData(mappedTransactionData(document));
      setHostname(requestData?.hostname ?? '');
      return true;
    } catch (e) {
      const error: any = e;
      if (error?.message === 'Connection Error') {
        checkHealth(currentNetwork.rpcUrl, requestData.key);
      }
      if (error?.message === 'Transaction signing request was rejected by the user') {
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure(
            'TRANSACTION_FAILED',
            { error: { message: error?.message } },
            requestData?.key,
          ),
        );
      }
    }
    return false;
  };

  const sendTransaction = async (): Promise<boolean> => {
    if (isErrorNetworkFee) {
      return false;
    }
    if (!document || !currentNetwork || !currentAccount) {
      setResponse(InjectionMessageInstance.failure('UNEXPECTED_ERROR', {}, requestData?.key));
      return false;
    }

    try {
      const signature = await transactionService.createSignature(currentAccount, document);
      setProcessType('PROCESSING');
      const transaction = await transactionService.createTransaction(document, signature);
      const hash = transactionService.createHash(transaction);
      const responseHash = await new Promise<string>((resolve) => {
        transactionService
          .sendTransaction(transaction)
          .then(resolve)
          .catch((error: TM2Error) => {
            const message = {
              hash,
              error: {
                name: error.name,
                message: error.message,
                log: error.log,
              },
            };
            setResponse(
              InjectionMessageInstance.failure('TRANSACTION_FAILED', message, requestData?.key),
            );
          });

        checkHealth(currentNetwork.rpcUrl, requestData?.key);
      });
      if (hash === responseHash) {
        setResponse(
          InjectionMessageInstance.success('TRANSACTION_SUCCESS', { hash }, requestData?.key),
        );
        return true;
      } else {
        setResponse(
          InjectionMessageInstance.failure('TRANSACTION_FAILED', { hash }, requestData?.key),
        );
      }
    } catch (e) {
      if (e instanceof Error) {
        const message = e.message;
        if (message.includes('Ledger')) {
          return false;
        }
      }
      setResponse(InjectionMessageInstance.failure('TRANSACTION_FAILED', {}, requestData?.key));
    }
    return false;
  };

  const onToggleTransactionData = (visibleTransactionInfo: boolean): void => {
    setVisibleTransactionInfo(visibleTransactionInfo);
  };

  const onClickConfirm = (): void => {
    if (!currentAccount) {
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
    sendTransaction().finally(() => setProcessType('DONE'));
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
      if (validate(currentAccount, requestData)) {
        initFavicon();
        initTransactionData();
        initBalance();
      }
    }
  }, [currentAccount, requestData, gnoProvider]);
  const onClickCancel = (): void => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure('TRANSACTION_REJECTED', {}, requestData?.key),
    );
  };

  const onResponseSendTransaction = useCallback(() => {
    if (response) {
      chrome.runtime.sendMessage(response);
    }
  }, [response]);

  const onTimeoutSendTransaction = useCallback(() => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure('NETWORK_TIMEOUT', {}, requestData?.key),
    );
  }, [requestData]);

  return (
    <ApproveTransaction
      title='Approve Transaction'
      domain={hostname}
      contracts={transactionData?.contracts}
      loading={transactionData === undefined}
      processing={processing}
      done={done}
      logo={favicon}
      isErrorNetworkFee={isErrorNetworkFee}
      networkFee={networkFee}
      onClickConfirm={onClickConfirm}
      onClickCancel={onClickCancel}
      onResponse={onResponseSendTransaction}
      onTimeout={onTimeoutSendTransaction}
      onToggleTransactionData={onToggleTransactionData}
      opened={visibleTransactionInfo}
      transactionData={JSON.stringify(document, null, 2)}
    />
  );
};

export default ApproveTransactionContainer;
