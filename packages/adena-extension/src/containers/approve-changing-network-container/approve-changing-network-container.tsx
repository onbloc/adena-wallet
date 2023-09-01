import { decodeParameter, parseParmeters } from '@common/utils/client-utils';
import ApproveChangingNetwork from '@components/approve/approve-changing-network/approve-changing-network/approve-changing-network';
import { useNetwork } from '@hooks/use-network';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const ApproveChangingNetworkContainer: React.FC = () => {
  const { search } = useLocation();
  const { currentNetwork, networks, changeNetwork } = useNetwork();
  const [requestData, setReqeustData] = useState<InjectionMessage>();
  const [chainId, setChainId] = useState('');

  const changable = useMemo(() => chainId.length > 0, [chainId]);

  const toNetwork = useMemo(() => {
    return networks.find(network => network.networkId === chainId);
  }, [networks, chainId]);

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
  };

  const onClickChangeNetwork = useCallback(async () => {
    await changeNetwork(chainId);
    chrome.runtime.sendMessage(
      InjectionMessageInstance.success(
        'SWITCH_NETWORK_SUCCESS',
        requestData?.data,
        requestData?.key,
      ),
    );
  }, [changeNetwork, requestData, chainId]);

  const onClickCancel = useCallback(() => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(
        'SWITCH_NETWORK_REJECTED',
        requestData?.data,
        requestData?.key,
      ),
    );
  }, [requestData])

  return (
    <ApproveChangingNetwork
      fromChain={{
        name: currentNetwork.networkName
      }}
      toChain={{
        name: toNetwork?.networkName || ''
      }}
      changable={changable}
      changeNetwork={onClickChangeNetwork}
      cancel={onClickCancel}
    />
  );
};

export default ApproveChangingNetworkContainer;