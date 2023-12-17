import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BigNumber from 'bignumber.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { StdSignDoc, Account, isLedgerAccount, AminoMsg } from 'adena-module';

import { ApproveTransaction } from '@components/molecules';
import { useCurrentAccount } from '@hooks/use-current-account';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import {
  createFaviconByHostname,
  decodeParameter,
  parseParameters,
} from '@common/utils/client-utils';
import { RoutePath } from '@router/path';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { validateInjectionData } from '@inject/message/methods';
import { useNetwork } from '@hooks/use-network';

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

const DEFAULT_DENOM = 'GNOT';

const ApproveSignContainer: React.FC = () => {
  const navigate = useNavigate();
  const { gnoProvider } = useWalletContext();
  const { walletService, transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [transactionData, setTransactionData] = useState<{ [key in string]: any } | undefined>(
    undefined,
  );
  const { currentNetwork } = useNetwork();
  const [hostname, setHostname] = useState('');
  const location = useLocation();
  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);
  const [document, setDocument] = useState<StdSignDoc>();
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

  useEffect(() => {
    checkLockWallet();
  }, [walletService]);

  const checkLockWallet = (): void => {
    walletService
      .isLocked()
      .then((locked) => locked && navigate(RoutePath.ApproveLogin + location.search));
  };

  useEffect(() => {
    if (location.search) {
      initRequestData();
    }
  }, [location]);

  const initRequestData = (): void => {
    const data = parseParameters(location.search);
    const parsedData = decodeParameter(data['data']);
    setRequestData({ ...parsedData, hostname: data['hostname'] });
  };

  useEffect(() => {
    if (currentAccount && requestData && gnoProvider) {
      if (validate(currentAccount, requestData)) {
        initFavicon();
        initTransactionData();
      }
    }
  }, [currentAccount, requestData, gnoProvider]);

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

  const initTransactionData = async (): Promise<boolean> => {
    if (!currentAccount || !requestData || !currentNetwork) {
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
      return true;
    } catch (e) {
      console.error(e);
      const error: any = e;
      if (error?.message === 'Transaction signing request was rejected by the user') {
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure('SIGN_REJECTED', requestData?.data, requestData?.key),
        );
      }
    }
    return false;
  };

  const createSignDocument = async (): Promise<boolean> => {
    if (!document || !currentAccount) {
      setResponse(InjectionMessageInstance.failure('UNEXPECTED_ERROR', {}, requestData?.key));
      return false;
    }

    try {
      const signature = await transactionService.createSignature(currentAccount, document);
      setProcessType('PROCESSING');
      setResponse(
        InjectionMessageInstance.success('SIGN_AMINO', { document, signature }, requestData?.key),
      );
    } catch (e) {
      if (e instanceof Error) {
        const message = e.message;
        if (message.includes('Ledger')) {
          return false;
        }
        setResponse(
          InjectionMessageInstance.failure('SIGN_FAILED', { error: { message } }, requestData?.key),
        );
      }
      setResponse(InjectionMessageInstance.failure('SIGN_FAILED', {}, requestData?.key));
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
      navigate(RoutePath.ApproveSignLoading, {
        state: {
          document,
          requestData,
        },
      });
      return;
    }

    createSignDocument().finally(() => setProcessType('DONE'));
  };

  const onClickCancel = (): void => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure('SIGN_REJECTED', {}, requestData?.key),
    );
  };

  const onResponseSignTransaction = useCallback(() => {
    if (response) {
      chrome.runtime.sendMessage(response);
    }
  }, [response]);

  const onTimeoutSignTransaction = useCallback(() => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure('NETWORK_TIMEOUT', {}, requestData?.key),
    );
  }, [requestData]);

  return (
    <ApproveTransaction
      title='Sign Transaction'
      domain={hostname}
      contracts={transactionData?.contracts}
      loading={transactionData === undefined}
      processing={processing}
      done={done}
      logo={favicon}
      networkFee={networkFee}
      onClickConfirm={onClickConfirm}
      onClickCancel={onClickCancel}
      onResponse={onResponseSignTransaction}
      onTimeout={onTimeoutSignTransaction}
      onToggleTransactionData={onToggleTransactionData}
      opened={visibleTransactionInfo}
      transactionData={JSON.stringify(document, null, 2)}
    />
  );
};

export default ApproveSignContainer;
