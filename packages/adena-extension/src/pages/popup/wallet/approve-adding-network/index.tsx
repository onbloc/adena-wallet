import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import { decodeParameter, parseParameters } from '@common/utils/client-utils';
import { CommonFullContentLayout } from '@components/atoms';
import ApproveAddingNetwork from '@components/pages/approve-adding-network/approve-adding-network/approve-adding-network';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { createSessionAccountUnsupportedResponse } from '@inject/message/session-account-response';
import { isSessionAccount } from 'adena-module';

const ApproveAddingNetworkContainer: React.FC = () => {
  const { search } = useLocation();
  const { addNetwork } = useNetwork();
  const { currentAccount } = useCurrentAccount();
  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [chainId, setChainId] = useState('');
  const [chainName, setChainName] = useState('');
  const [rpcUrl, setRPCUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [response, setResponse] = useState<InjectionMessage>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (search) {
      initRequestData();
    }
  }, [search]);

  // The background guard runs when the message arrives, but the popup may sit on
  // the unlock screen for a while and the selected account can change meanwhile.
  // Re-check here so a SessionAccount can never approve a network mutation.
  useEffect(() => {
    if (!currentAccount || !requestData) {
      return;
    }
    if (isSessionAccount(currentAccount)) {
      chrome.runtime.sendMessage(createSessionAccountUnsupportedResponse(requestData.key));
      window.close();
    }
  }, [currentAccount, requestData]);

  const initRequestData = (): void => {
    const data = parseParameters(search);
    const parsedData = decodeParameter(data['data']);
    setRequestData({ ...parsedData, hostname: data['hostname'] });

    setChainId(parsedData?.data?.chainId || '');
    setChainName(parsedData?.data?.chainName || '');
    setRPCUrl(parsedData?.data?.rpcUrl || '');
  };

  const onClickApprove = useCallback(async () => {
    setProcessing(true);
    await addNetwork('gno', chainName, rpcUrl, chainId, { indexerUrl: '' });
    setResponse(
      InjectionMessageInstance.success(
        WalletResponseSuccessType.ADD_NETWORK_SUCCESS,
        requestData?.data,
        requestData?.key,
      ),
    );
    setDone(true);
  }, [addNetwork, chainName, rpcUrl, chainId, requestData]);

  const onResponse = useCallback(() => {
    if (done && response) {
      chrome.runtime.sendMessage(response);
    }
  }, [done, response]);

  const onTimeout = (): void => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.NETWORK_TIMEOUT,
        {},
        requestData?.key,
      ),
    );
  };

  const onClickCancel = useCallback(() => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(
        WalletResponseRejectType.ADD_NETWORK_REJECTED,
        requestData?.data,
        requestData?.key,
      ),
    );
  }, [requestData]);

  return (
    <CommonFullContentLayout>
      <ApproveAddingNetwork
        networkInfo={{
          name: chainName,
          rpcUrl: rpcUrl,
          chainId: chainId,
        }}
        logo={''}
        approvable={requestData !== undefined}
        processing={processing}
        done={done}
        approve={onClickApprove}
        cancel={onClickCancel}
        onResponse={onResponse}
        onTimeout={onTimeout}
      />
    </CommonFullContentLayout>
  );
};

export default ApproveAddingNetworkContainer;
