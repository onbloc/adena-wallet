import React, { useEffect, useRef, useState } from 'react';
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
import { LedgerConnector } from 'adena-module';

// TODO: ApproveTransaction
export const ApproveSign = () => {
  const { accountService, transactionService } = useAdenaContext();
  const getDataRef = useRef<HTMLInputElement | null>(null);
  const [currentAccount, , changeCurrentAccount] = useCurrentAccount();
  const [transactionData, setTrasactionData] = useState<{ [key in string]: any } | undefined>(
    undefined,
  );
  const [gnoClient, , updateGnoClient] = useGnoClient();
  const [hostname, setHostname] = useState('');
  const [gasFee, setGasFee] = useState(0);
  const location = useLocation();
  const [requestData, setReqeustData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);

  useEffect(() => {
    if (!gnoClient) {
      updateGnoClient();
    }
  }, [gnoClient]);

  useEffect(() => {
    if (location.state?.requestData) {
      setReqeustData(location.state?.requestData);
    }
  }, [location]);

  useEffect(() => {
    if (gnoClient && currentAccount && requestData) {
      initFavicon();
      initTransactionData();
    } else if (gnoClient && requestData) {
      initCurrentAccount();
    }
  }, [gnoClient, currentAccount, requestData]);

  const initCurrentAccount = async () => {
    const currentAccount = await accountService.getCurrentAccount();
    changeCurrentAccount(currentAccount);
  };

  const initFavicon = async () => {
    const faviconData = await createFaviconByHostname(requestData?.hostname ?? '');
    setFavicon(faviconData);
  };

  const initTransactionData = async () => {
    if (!gnoClient || !currentAccount) {
      return false;
    }
    try {
      const transaction = await transactionService.createTransactionData(
        currentAccount,
        requestData?.data?.messages,
        requestData?.data?.gasWanted,
        requestData?.data?.gasFee,
        requestData?.data?.memo,
      );
      setTrasactionData(transaction);
      setGasFee(requestData?.data?.gasFee ?? 0);
      setHostname(requestData?.hostname ?? '');
      return true;
    } catch (e) {
      console.error(e);
      const error: any = e;
      if (error?.message === 'Transaction signing request was rejected by the user') {
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure('SIGN_FAILED', requestData?.data, requestData?.key),
        );
      }
    }
    return false;
  };

  const signTransaction = async () => {
    if (transactionData && gnoClient && currentAccount) {
      try {
        const signedAmino = await transactionService.createAminoSign(
          currentAccount.getAddress(),
          requestData?.data?.messages,
          requestData?.data?.gasWanted,
          requestData?.data?.gasFee,
          requestData?.data?.memo,
        );
        if (signedAmino) {
          chrome.runtime.sendMessage(
            InjectionMessageInstance.success('SIGN_AMINO', signedAmino, requestData?.key),
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
          InjectionMessageInstance.failure('SIGN_FAILED', requestData?.data, requestData?.key),
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
    if (currentAccount?.data.signerType === 'AMINO') {
      signTransaction();
    }
    if (currentAccount?.data.signerType === 'LEDGER') {
      setLoadingLedger(true);
    }
  };

  const cancelEvent = async () => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure('SIGN_REJECTED', requestData?.data, requestData?.key),
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
          <textarea
            className='raw-info-textarea'
            value={JSON.stringify(transactionData?.document ?? '', null, 4)}
            readOnly
            draggable={false}
          />
        )}
      </TransactionInfoBox>
    );
  };

  const renderApproveTransaction = () => {
    return (
      <Wrapper>
        {loadingLedger ? (
          <ApproveLdegerLoading createTransaction={signTransaction} cancel={cancelLedger} />
        ) : (
          <>
            <Text type='header4'>Sign Transaction</Text>
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
                text: 'Sign',
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
    <LoadingApproveTransaction rightButtonText='Signin' />
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
  .raw-info-textarea {
    width: 100%;
    height: 120px;
    overflow: auto;
    border-radius: 24px;
    background-color: ${({ theme }) => theme.color.neutral[8]};
    border: 1px solid ${({ theme }) => theme.color.neutral[6]};
    padding: 12px;
    ${({ theme }) => theme.fonts.body2Reg};
    resize: none;
    margin-bottom: 10px;
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
