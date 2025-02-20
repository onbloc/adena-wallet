import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import { decodeParameter, parseParameters } from '@common/utils/client-utils';
import { CommonFullContentLayout } from '@components/atoms';
import ApproveChangingNetwork from '@components/pages/approve-changing-network/approve-changing-network/approve-changing-network';
import { useAdenaContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { RoutePath } from '@types';

const ApproveChangingNetworkContainer: React.FC = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { currentNetwork, networks, changeNetwork } = useNetwork();
  const { walletService } = useAdenaContext();
  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [chainId, setChainId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [response, setResponse] = useState<InjectionMessage>();
  const [done, setDone] = useState(false);

  const changeable = useMemo(() => chainId.length > 0, [chainId]);

  const toNetwork = useMemo(() => {
    return networks.find((network) => network.networkId === chainId);
  }, [networks, chainId]);

  useEffect(() => {
    if (search) {
      initRequestData();
    }
  }, [search]);

  const initRequestData = (): void => {
    const data = parseParameters(search);
    const parsedData = decodeParameter(data['data']);
    setRequestData({ ...parsedData, hostname: data['hostname'] });
    setChainId(parsedData?.data?.chainId || '');
  };

  const checkLockWallet = (): void => {
    walletService.isLocked().then((locked) => locked && navigate(RoutePath.ApproveLogin + search));
  };

  const onClickChangeNetwork = useCallback(async () => {
    setProcessing(true);
    const network = networks.find(
      (network) => network.chainId === chainId && network.deleted !== true,
    );
    if (!network) {
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNADDED_NETWORK,
          requestData?.data,
          requestData?.key,
        ),
      );
      return;
    }
    await changeNetwork(network.id);
    setResponse(
      InjectionMessageInstance.success(
        WalletResponseSuccessType.SWITCH_NETWORK_SUCCESS,
        requestData?.data,
        requestData?.key,
      ),
    );
    setDone(true);
  }, [changeNetwork, requestData, chainId, networks]);

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
        WalletResponseRejectType.SWITCH_NETWORK_REJECTED,
        requestData?.data,
        requestData?.key,
      ),
    );
  }, [requestData]);

  useEffect(() => {
    checkLockWallet();
  }, [walletService]);

  return (
    <CommonFullContentLayout>
      <ApproveChangingNetwork
        fromChain={{
          name: currentNetwork.networkName,
        }}
        toChain={{
          name: toNetwork?.networkName || '',
        }}
        changeable={changeable}
        processing={processing}
        done={done}
        changeNetwork={onClickChangeNetwork}
        cancel={onClickCancel}
        onResponse={onResponse}
        onTimeout={onTimeout}
      />
    </CommonFullContentLayout>
  );
};

export default ApproveChangingNetworkContainer;
