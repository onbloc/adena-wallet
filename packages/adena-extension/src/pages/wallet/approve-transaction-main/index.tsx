import React, { useEffect, useState } from 'react';
import DefaultFavicon from './../../../assets/favicon-default.svg';
import styled from 'styled-components';
import Text from '@components/text';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import { useLocation } from 'react-router-dom';
import { useGnoClient } from '@hooks/use-gno-client';
import { useCurrentAccount } from '@hooks/use-current-account';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { createFaviconByHostname } from '@common/utils/client-utils';
import LoadingApproveTransaction from '@components/loading-screen/loading-approve-transaction';
import { ApproveLdegerLoading } from './approve-ledger-loading';
import Button from '@components/buttons/button';
import IconArraowDown from '@assets/arrowS-down-gray.svg';
import IconArraowUp from '@assets/arrowS-up-gray.svg';
import { useAdenaContext } from '@hooks/use-context';
import { LedgerConnector, isLedgerAccount, StdSignDoc } from 'adena-module';

function mappedTransactionData(document: StdSignDoc) {
  return {
    messages: document.msgs,
    contracts: document.msgs.map((message) => {
      return {
        type: message?.type || '',
        function: message?.value?.func || '',
        value: message?.value || '',
      };
    }),
    gasWanted: document.fee.gas,
    gasFee: `${document.fee.amount[0].amount}${document.fee.amount[0].denom}`,
    document,
  }
}

export const ApproveTransactionMain = () => {
  const { transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [transactionData, setTrasactionData] = useState<{ [key in string]: any } | undefined>(
    undefined,
  );
  const [gnoClient] = useGnoClient();
  const [hostname, setHostname] = useState('');
  const [gasFee, setGasFee] = useState(0);
  const location = useLocation();
  const [requestData, setReqeustData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);
  const [document, setDocument] = useState<StdSignDoc>();

  useEffect(() => {
    if (location.state?.requestData) {
      setReqeustData(location.state?.requestData);
    }
  }, [location]);

  useEffect(() => {
    if (currentAccount && requestData) {
      initFavicon();
      initTransactionData();
    }
  }, [currentAccount, requestData]);

  const initFavicon = async () => {
    const faviconData = await createFaviconByHostname(requestData?.hostname ?? '');
    setFavicon(faviconData);
  };

  const initTransactionData = async () => {
    if (!gnoClient || !currentAccount) {
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
      setGasFee(requestData?.data?.gasFee ?? 0);
      setHostname(requestData?.hostname ?? '');
      return true;
    } catch (e) {
      console.error(e);
      const error: any = e;
      if (error?.message === 'Transaction signing request was rejected by the user') {
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure(
            'TRANSACTION_FAILED',
            requestData?.data,
            requestData?.key,
          ),
        );
      }
    }
    return false;
  };

  const createLedgerTransaction = async () => {
    if (!currentAccount || !gnoClient || !document) {
      return false;
    }
    if (!isLedgerAccount(currentAccount)) {
      return false;
    }

    const result = await transactionService.createSignatureWithLedger(currentAccount, document).then(async (signature) => {
      const transaction = await transactionService.createTransaction(document, signature);
      const result = await transactionService.sendTransaction(gnoClient, transaction);
      if (result.height && result.height !== '0') {
        chrome.runtime.sendMessage(
          InjectionMessageInstance.success('TRANSACTION_SENT', result, requestData?.key),
        );
      }
      chrome.runtime.sendMessage(
        InjectionMessageInstance.failure('TRANSACTION_FAILED', result, requestData?.key),
      );
      return true;
    }).catch((error: Error) => {
      if (error.message.includes('Ledger')) {
        return false;
      }
      if (error.message === 'Transaction signing request was rejected by the user') {
        cancelEvent();
      }
      return false;
    });
    return result;
  };

  const sendTransaction = async () => {
    if (document && gnoClient && currentAccount) {
      try {
        const signature = await transactionService.createSignature(
          currentAccount,
          document
        );
        const transaction = await transactionService.createTransaction(document, signature);
        const result = await transactionService.sendTransaction(gnoClient, transaction);
        if (result.height && result.height !== '0') {
          chrome.runtime.sendMessage(
            InjectionMessageInstance.success('TRANSACTION_SENT', result, requestData?.key),
          );
          return true;
        } else {
          chrome.runtime.sendMessage(
            InjectionMessageInstance.failure('TRANSACTION_FAILED', result, requestData?.key),
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          const message = e.message;
          if (message.includes('Ledger')) {
            return false;
          }
        }
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure(
            'TRANSACTION_FAILED',
            requestData?.data,
            requestData?.key,
          ),
        );
      }
    } else {
      chrome.runtime.sendMessage(
        InjectionMessageInstance.failure('UNEXPECTED_ERROR', requestData?.data, requestData?.key),
      );
    }
    return false;
  };

  const approveEvent = async () => {
    if (!currentAccount) {
      return;
    }
    if (isLedgerAccount(currentAccount)) {
      setLoadingLedger(true);
      return;
    }

    sendTransaction();
  };

  const cancelEvent = async () => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure('TRANSACTION_REJECTED', requestData?.data, requestData?.key),
    );
  };

  const getContractFunctionText = ({
    type = '',
    functionName = '',
  }: {
    type?: string;
    functionName?: string;
  }) => {
    if (!transactionData) {
      return '';
    }
    if (`${type}`.indexOf('bank.MsgSend') > -1) {
      return 'Transfer';
    }
    return functionName;
  };

  const cancelLedger = async () => {
    await LedgerConnector.closeConnected();
    window.close();
  };

  const renderContracts = () => {
    if (!transactionData || !Array.isArray(transactionData.contracts)) {
      return <></>;
    }

    return transactionData.contracts.map((contract, index) => (
      <BundleDataBox key={index}>
        <BundleDL>
          <dt>Contract</dt>
          <dd id='atv_contract'>{contract?.type ?? ''}</dd>
        </BundleDL>
        <BundleDL>
          <dt>Function</dt>
          <dd id='atv_function'>
            {getContractFunctionText({ type: contract?.type, functionName: contract?.function })}
          </dd>
        </BundleDL>
      </BundleDataBox>
    ));
  };

  const renderTransactionInfo = () => {
    const buttonText = visibleTransactionInfo ? 'Hide Transaction Data' : 'View Transaction Data';
    return (
      <TransactionInfoBox>
        <Button
          className='visible-button'
          onClick={() => setVisibleTransactionInfo(!visibleTransactionInfo)}
        >
          {`${buttonText}`}
          <img src={visibleTransactionInfo ? IconArraowUp : IconArraowDown} />
        </Button>
        {visibleTransactionInfo && (
          <div className='textarea-wrapper'>
            <textarea
              className='raw-info-textarea'
              value={JSON.stringify(transactionData?.document ?? '', null, 4)}
              readOnly
              draggable={false}
            />
          </div>
        )}
      </TransactionInfoBox>
    );
  };

  const renderApproveTransaction = () => {
    return (
      <Wrapper>
        {loadingLedger ? (
          <ApproveLdegerLoading createTransaction={createLedgerTransaction} cancel={cancelLedger} />
        ) : (
          <>
            <Text type='header4'>Approve Transaction</Text>
            <img className='logo' src={favicon ?? DefaultFavicon} alt='gnoland-logo' />
            <RoundedBox>
              <Text type='body2Reg' color={'#ffffff'}>
                {hostname}
              </Text>
            </RoundedBox>
            {renderContracts()}
            <RoundedDataBox className='sub-info'>
              <RoundedDL>
                <dt>Network Fee:</dt>
                <dd>{`${gasFee * 0.000001} GNOT`}</dd>
              </RoundedDL>
            </RoundedDataBox>
            {renderTransactionInfo()}
            <CancelAndConfirmButton
              cancelButtonProps={{ onClick: cancelEvent }}
              confirmButtonProps={{
                onClick: approveEvent,
                text: 'Approve',
              }}
            />
          </>
        )}
      </Wrapper>
    );
  };

  return transactionData ? (
    renderApproveTransaction()
  ) : (
    <LoadingApproveTransaction rightButtonText='Approve' />
  );
};

const Wrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  max-width: 380px;
  min-height: 514px;
  padding: 20px 24px;
  .logo {
    margin: 24px auto;
    width: 100px;
    height: auto;
  }
`;

const RoundedBox = styled.span`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  width: 100%;
  height: 41px;
  border-radius: 24px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  padding: 0px 18px;
`;

const DataBoxStyle = styled.div`
  ${({ theme }) => theme.fonts.body1Reg};
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'center')};
  width: 100%;
  dl {
    background-color: ${({ theme }) => theme.color.neutral[8]};
    padding: 0px 20px 0px 17px;
  }
  dd {
    color: ${({ theme }) => theme.color.neutral[0]};
  }

  &.sub-info * {
    font-size: ${({ theme }) => theme.fonts.body2Reg};
  }
`;

const DLWrapStyle = styled.dl`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  ${({ theme }) => theme.fonts.body1Reg};
  width: 100%;
  padding: 0px 18px;
`;

const BundleDataBox = styled(DataBoxStyle)`
  margin: 8px 0px 10px;
  gap: 2px;
  dt {
    color: ${({ theme }) => theme.color.neutral[9]};
  }
  & dl:first-child {
    border-top-left-radius: 18px;
    border-top-right-radius: 18px;
  }
  & dl:last-child {
    border-bottom-left-radius: 18px;
    border-bottom-right-radius: 18px;
  }
`;

const RoundedDataBox = styled(DataBoxStyle)`
  dt {
    color: ${({ theme }) => theme.color.neutral[9]};
  }
  margin-bottom: 10px;
`;

const TransactionInfoBox = styled(DataBoxStyle)`
  .visible-button {
    color: ${({ theme }) => theme.color.neutral[9]};
    height: fit-content;
    margin-bottom: 10px;

    img {
      margin-left: 3px;
    }
  }
  .textarea-wrapper {
    width: 100%;
    height: 120px;
    border-radius: 24px;
    background-color: ${({ theme }) => theme.color.neutral[8]};
    border: 1px solid ${({ theme }) => theme.color.neutral[6]};
    padding: 12px 16px;
    margin-bottom: 10px;
  }
  .raw-info-textarea {
    width: 100%;
    height: 100%;
    overflow: auto;
    ${({ theme }) => theme.fonts.body2Reg};
    resize: none;
  }
  .raw-info-textarea::-webkit-scrollbar {
    width: 2px;
    padding: 1px 1px 1px 0px;
    margin-right: 10px;
  }

  .raw-info-textarea::-webkit-scrollbar-thumb {
    background-color: darkgrey;
  }

  .raw-info-textarea::-webkit-resizer {
    display: none !important;
  }

  margin-bottom: 10px;
`;

const BundleDL = styled(DLWrapStyle)`
  height: 44px;
`;

const RoundedDL = styled(DLWrapStyle)`
  height: 48px;
  border-radius: 30px;
  border: 1px solid ${({ theme }) => theme.color.neutral[6]};
`;
