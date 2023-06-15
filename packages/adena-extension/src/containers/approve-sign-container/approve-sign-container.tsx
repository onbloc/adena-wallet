import React, { useCallback, useEffect, useState } from 'react';
import ApproveTransaction from '@components/approve/approve-transaction/approve-transaction';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGnoClient } from '@hooks/use-gno-client';
import { useCurrentAccount } from '@hooks/use-current-account';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { createFaviconByHostname, decodeParameter, parseParmeters } from '@common/utils/client-utils';
import { useAdenaContext } from '@hooks/use-context';
import { StdSignDoc, Account, isLedgerAccount } from 'adena-module';
import { RoutePath } from '@router/path';
import { validateInjectionData } from '@inject/message/methods';
import BigNumber from 'bignumber.js';

function mappedTransactionData(document: StdSignDoc) {
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
  }
}

const ApproveSignContainer: React.FC = () => {
  const navigate = useNavigate();
  const { walletService, transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [transactionData, setTrasactionData] = useState<{ [key in string]: any } | undefined>(
    undefined,
  );
  const [gnoClient] = useGnoClient();
  const [hostname, setHostname] = useState('');
  const location = useLocation();
  const [requestData, setReqeustData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);
  const [document, setDocument] = useState<StdSignDoc>();

  useEffect(() => {
    checkLockWallet();
  }, [walletService]);

  const checkLockWallet = () => {
    walletService.isLocked().then(locked => locked && navigate(RoutePath.ApproveLogin + location.search));
  }

  useEffect(() => {
    if (location.search) {
      initRequestData();
    }
  }, [location]);

  const initRequestData = () => {
    const data = parseParmeters(location.search);
    const parsedData = decodeParameter(data['data']);
    setReqeustData({ ...parsedData, hostname: data['hostname'] });
  };

  useEffect(() => {
    if (currentAccount && requestData) {
      if (validate(currentAccount, requestData)) {
        initFavicon();
        initTransactionData();
      }
    }
  }, [currentAccount, requestData]);

  const validate = (currentAccount: Account, requestData: InjectionMessage) => {
    const validationMessage = validateInjectionData(currentAccount.getAddress('g'), requestData);
    if (validationMessage) {
      chrome.runtime.sendMessage(validationMessage);
      return false;
    }
    return true;
  }

  const initFavicon = async () => {
    const faviconData = await createFaviconByHostname(requestData?.hostname ?? '');
    setFavicon(faviconData);
  };

  const initTransactionData = async () => {
    if (!gnoClient || !currentAccount || !requestData) {
      return false;
    }
    try {
      const document = await transactionService.createDocument(
        gnoClient,
        currentAccount,
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
      console.error(e);
      const error: any = e;
      if (error?.message === 'Transaction signing request was rejected by the user') {
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure(
            'SIGN_REJECTED',
            requestData?.data,
            requestData?.key,
          ),
        );
      }
    }
    return false;
  };

  const getNetworkFee = useCallback(() => {
    const networkFeeAmount = BigNumber(document?.fee.amount[0]?.amount ?? 1).shiftedBy(-6);
    return `${networkFeeAmount} GNOT`;
  }, [document]);

  const sendTransaction = async () => {
    if (!document || !gnoClient || !currentAccount) {
      chrome.runtime.sendMessage(
        InjectionMessageInstance.failure('UNEXPECTED_ERROR', requestData?.data, requestData?.key),
      );
      return false;
    }

    try {
      const signature = await transactionService.createSignature(
        currentAccount,
        document
      );
      chrome.runtime.sendMessage(
        InjectionMessageInstance.success('SIGN_AMINO', { document, signature }, requestData?.key),
      );
    } catch (e) {
      if (e instanceof Error) {
        const message = e.message;
        if (message.includes('Ledger')) {
          return false;
        }
      }
      chrome.runtime.sendMessage(
        InjectionMessageInstance.failure(
          'SIGN_FAILED',
          requestData?.data,
          requestData?.key,
        ),
      );
    }
    return false;
  };

  const onToggleTransactionData = (visibleTransactionInfo: boolean) => {
    setVisibleTransactionInfo(visibleTransactionInfo);
  };

  const onClickConfirm = () => {
    if (!currentAccount) {
      return;
    }
    if (isLedgerAccount(currentAccount)) {
      navigate(RoutePath.ApproveSignLoading, {
        state: {
          document,
          requestData
        }
      });
      return;
    }
    sendTransaction();
  };

  const onClickCancel = () => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure('SIGN_REJECTED', requestData?.data, requestData?.key),
    );
  };

  return (
    <ApproveTransaction
      title='Sign Transaction'
      domain={hostname}
      contracts={transactionData?.contracts}
      loading={transactionData === undefined}
      logo={favicon}
      networkFee={getNetworkFee()}
      onClickConfirm={onClickConfirm}
      onClickCancel={onClickCancel}
      onToggleTransactionData={onToggleTransactionData}
      opened={visibleTransactionInfo}
      transactionData={JSON.stringify(document, null, 2)}
    />
  );
};

export default ApproveSignContainer;