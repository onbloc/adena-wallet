import { decodeParameter, parseParmeters } from '@common/utils/client-utils';
import ApproveAddingNetwork from '@components/approve/approve-adding-network/approve-adding-network/approve-adding-network';
import { useNetwork } from '@hooks/use-network';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const ApproveAddingNetworkContainer: React.FC = () => {
  const { search } = useLocation();
  const { addNetwork } = useNetwork();
  const [requestData, setReqeustData] = useState<InjectionMessage>();
  const [chainId, setChainId] = useState('');
  const [chainName, setChainName] = useState('');
  const [rpcUrl, setRPCUrl] = useState('');

  useEffect(() => {
    if (search) {
      initRequestData();
    }
  }, [search]);

  const initRequestData = () => {
    const data = parseParmeters(search);
    const parsedData = decodeParameter(data['data']);
    setReqeustData({ ...parsedData, hostname: data['hostname'] });

    setChainId(parsedData?.data?.chainId || '');
    setChainName(parsedData?.data?.chainName || '');
    setRPCUrl(parsedData?.data?.rpcUrl || '');
  };

  const onClickApprove = useCallback(async () => {
    await addNetwork(chainName, rpcUrl, chainId);
    chrome.runtime.sendMessage(
      InjectionMessageInstance.success(
        'ADD_NETWORK_SUCCESS',
        requestData?.data,
        requestData?.key,
      ),
    );

  }, [addNetwork, chainName, rpcUrl, chainId, requestData]);

  const onClickCancel = useCallback(() => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(
        'ADD_NETWORK_REJECTED',
        requestData?.data,
        requestData?.key,
      ),
    );
  }, [requestData]);

  return (
    <ApproveAddingNetwork
      networkInfo={{
        name: chainName,
        rpcUrl: rpcUrl,
        chainId: chainId
      }}
      logo={''}
      approvable={requestData !== undefined}
      approve={onClickApprove}
      cancel={onClickCancel}
    />
  );
};

export default ApproveAddingNetworkContainer;