import React, { useEffect, useRef, useState } from 'react';
import DefaultFavicon from './../../../assets/favicon-default.svg';
import styled from 'styled-components';
import Text from '@components/text';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import { useLocation } from 'react-router-dom';
import { useGnoClient } from '@hooks/use-gno-client';
import { useCurrentAccount } from '@hooks/use-current-account';
import { TransactionService } from '@services/index';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { useWallet } from '@hooks/use-wallet';
import { useWalletAccounts } from '@hooks/use-wallet-accounts';
import { createFaviconByHostname } from '@common/utils/client-utils';
import { LocalStorageValue } from '@common/values';
import LoadingApproveTransaction from '@components/loading-screen/loading-approve-transaction';

export const ApproveTransactionMain = () => {
  const getDataRef = useRef<HTMLInputElement | null>(null);
  const [currentAccount, , changeCurrentAccount] = useCurrentAccount();
  const [wallet, state] = useWallet();
  const { initAccounts } = useWalletAccounts(wallet);
  const [transactionData, setTrasactionData] = useState<{ [key in string]: any } | undefined>(undefined);
  const [gnoClient, , updateGnoClient] = useGnoClient();
  const [hostname, setHostname] = useState('');
  const [gasFee, setGasFee] = useState(0);
  const location = useLocation();
  const [requestData, setReqeustData] = useState<InjectionMessage>()
  const [favicon, setFavicon] = useState<any>(null);

  useEffect(() => {
    if (!gnoClient) {
      updateGnoClient();
    }
  }, [gnoClient])

  useEffect(() => {
    if (location.state?.requestData) {
      setReqeustData(location.state?.requestData);
    }
  }, [location])

  useEffect(() => {
    if (wallet) {
      if (state === 'FINISH') {
        initAccounts();
      }
    }
  }, [wallet, state]);

  useEffect(() => {
    if (gnoClient && currentAccount && requestData) {
      initFavicon();
      initTransactionData();
    } else if (gnoClient && requestData) {
      initCurrentAccount()
    }
  }, [gnoClient, currentAccount, requestData]);

  const initCurrentAccount = async () => {
    const currentAccountAddress = await LocalStorageValue.get('CURRENT_ACCOUNT_ADDRESS');
    changeCurrentAccount(currentAccountAddress);
  }

  const initFavicon = async () => {
    const faviconData = await createFaviconByHostname(requestData?.hostname ?? '');
    setFavicon(faviconData);
  }

  const initTransactionData = async () => {
    if (!gnoClient || !currentAccount) {
      return;
    }
    try {
      const transaction = await TransactionService.createTransactionByContract(
        gnoClient,
        currentAccount,
        requestData?.data?.messages,
        requestData?.data?.gasWanted,
        requestData?.data?.gasFee,
        requestData?.data?.memo
      );
      setGasFee(requestData?.data?.gasFee ?? 0);
      setHostname(requestData?.hostname ?? '');
      setTrasactionData(transaction);
    } catch (e) {
      console.error(e);
    }
  }


  const approveEvent = async () => {
    if (state === 'FINISH' && transactionData && gnoClient && currentAccount) {
      try {
        const transaction = transactionData.value;
        const result = await TransactionService.sendTransaction(gnoClient, transaction);
        if (result.height && result.height !== "0") {
          chrome.runtime.sendMessage(InjectionMessageInstance.success('TRANSACTION_SENT', result, requestData?.key));
        } else {
          chrome.runtime.sendMessage(InjectionMessageInstance.failure('TRANSACTION_FAILED', result, requestData?.key));
        }
      } catch (e) {
        chrome.runtime.sendMessage(InjectionMessageInstance.failure('TRANSACTION_FAILED', requestData?.data, requestData?.key));
      }
    } else {
      chrome.runtime.sendMessage(InjectionMessageInstance.failure('UNEXPECTED_ERROR', requestData?.data, requestData?.key));
    }
  };

  const cancelEvent = async () => {
    chrome.runtime.sendMessage(InjectionMessageInstance.failure('TRANSACTION_REJECTED', requestData?.data, requestData?.key));
  };

  const getContractFunctionText = () => {
    if (!transactionData) {
      return '';
    }
    if (`${transactionData.contracts[0]?.type}`.indexOf('bank.MsgSend') > -1) {
      return 'Send';
    }
    return transactionData.contracts[0]?.function;
  }

  return transactionData ? (
    <Wrapper>
      <Text type='header4'>Approve Transaction</Text>
      <img className='logo' src={favicon ?? DefaultFavicon} alt='gnoland-logo' />
      <RoundedBox>
        <Text type='body2Reg' color={'#ffffff'}>
          {hostname}
        </Text>
      </RoundedBox>
      <BundleDataBox>
        <BundleDL>
          <dt>Contract</dt>
          <dd id='atv_contract'>{transactionData.contracts[0]?.type ?? ''}</dd>
        </BundleDL>
        <BundleDL>
          <dt>Function</dt>
          <dd id='atv_function'>{getContractFunctionText()}</dd>
        </BundleDL>
      </BundleDataBox>
      <RoundedDataBox className='sub-info'>
        <RoundedDL>
          <dt>Network Fee:</dt>
          <dd>{`${gasFee * 0.000001} GNOT`}</dd>
        </RoundedDL>
      </RoundedDataBox>
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: cancelEvent }}
        confirmButtonProps={{
          onClick: approveEvent,
          text: 'Approve',
        }}
      />
    </Wrapper>
  ) : (
    <LoadingWrapper>
      <LoadingApproveTransaction />
    </LoadingWrapper>
  )
};

const LoadingWrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: calc(100vh - 48px);
  padding: 0 20px 24px 20px;
`;

const Wrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: calc(100vh - 48px);
  padding: 24px 20px;
  .logo {
    margin: 24px auto;
    width: 60px;
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
`;

const BundleDL = styled(DLWrapStyle)`
  height: 44px;
`;

const RoundedDL = styled(DLWrapStyle)`
  height: 48px;
  border-radius: 30px;
  border: 1px solid ${({ theme }) => theme.color.neutral[6]};
`;
