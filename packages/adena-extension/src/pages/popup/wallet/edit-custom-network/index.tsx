import React, { useCallback, useEffect, useMemo } from 'react';

import EditNetwork from '@components/pages/edit-network/edit-network';
import { useCustomNetworkInput } from '@hooks/use-custom-network-input';
import { useNetwork } from '@hooks/use-network';
import { CommonFullContentLayout } from '@components/atoms';

import { NetworkMetainfo } from '@types';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

function isValidURL(rpcURL: string): boolean {
  const regExp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
  return regExp.test(rpcURL);
}

function existsChainId(chainId: string, networks: NetworkMetainfo[]): boolean {
  return (
    networks.findIndex((network) => network.networkId === chainId && network.deleted !== true) > -1
  );
}

function existsRPCUrl(rpcUrl: string, networks: NetworkMetainfo[]): boolean {
  const currentRPCUrl = rpcUrl.endsWith('/') ? rpcUrl.substring(0, rpcUrl.length - 1) : rpcUrl;
  return (
    networks.findIndex((network) => network.rpcUrl === currentRPCUrl && network.deleted !== true) >
    -1
  );
}

const EditCustomNetworkContainer: React.FC = () => {
  const { params, goBack } = useAppNavigate<RoutePath.EditCustomNetwork>();
  const currentNetworkId = params.networkId;
  const { networks, updateNetwork, getDefaultNetworkInfo, deleteNetwork } = useNetwork();
  const {
    name,
    rpcUrl,
    indexerUrl,
    chainId,
    rpcUrlError,
    indexerUrlError,
    chainIdError,
    changeName,
    changeRPCUrl,
    changeIndexerUrl,
    changeChainId,
    setRPCUrlError,
    setIndexerUrlError,
    setChainIdError,
  } = useCustomNetworkInput();

  useEffect(() => {
    initInput(currentNetworkId);
  }, [currentNetworkId]);

  const originNetwork = useMemo(() => {
    const currentNetwork = networks.find((network) => network.id === currentNetworkId);
    return currentNetwork;
  }, [networks, currentNetworkId]);

  const savable = useMemo(() => {
    if (!originNetwork) {
      return false;
    }
    if (name === '' || rpcUrl === '' || chainId === '') {
      return false;
    }
    return (
      originNetwork.networkName !== name ||
      originNetwork.rpcUrl !== rpcUrl ||
      originNetwork.indexerUrl !== indexerUrl ||
      originNetwork.networkId !== chainId
    );
  }, [originNetwork, name, rpcUrl, indexerUrl, chainId]);

  const defaultNetworkInfo = useMemo(() => {
    return getDefaultNetworkInfo(currentNetworkId);
  }, [currentNetworkId, getDefaultNetworkInfo]);

  const editType: 'rpc-only' | 'all-default' | 'all' = useMemo(() => {
    if (!defaultNetworkInfo) {
      return 'all';
    }
    if (defaultNetworkInfo.id === 'dev') {
      return 'all-default';
    }
    return 'rpc-only';
  }, [defaultNetworkInfo]);

  function initInput(networkId: string): void {
    const network = networks.find((current) => current.id === networkId);
    if (network) {
      changeName(network.networkName);
      changeRPCUrl(network.rpcUrl);
      changeIndexerUrl(network.indexerUrl);
      changeChainId(network.chainId);
    }
  }

  const saveNetwork = useCallback(async () => {
    let isValid = true;
    if (!isValidURL(rpcUrl)) {
      isValid = false;
      setRPCUrlError('Invalid URL');
    }
    if (!!indexerUrl && !isValidURL(indexerUrl)) {
      isValid = false;
      setIndexerUrlError('Invalid URL');
    }
    if (existsChainId(chainId, networks)) {
      if (originNetwork?.chainId !== chainId) {
        isValid = false;
        setChainIdError('Chain ID already in use');
      }
    }
    if (existsRPCUrl(rpcUrl, networks)) {
      if (originNetwork?.rpcUrl !== rpcUrl) {
        isValid = false;
        setRPCUrlError('RPC URL already in use');
      }
    }
    if (!isValid) {
      return;
    }
    const network = networks.find((current) => current.id === currentNetworkId);
    if (network) {
      const parsedName = name.trim();
      await updateNetwork({
        ...network,
        chainId: chainId,
        networkId: chainId,
        chainName: parsedName,
        networkName: parsedName,
        rpcUrl,
        indexerUrl,
      });
    }
    setRPCUrlError('');
    setChainIdError('');
    goBack();
  }, [networks, name, rpcUrl, indexerUrl, chainId, currentNetworkId, originNetwork]);

  const clearNetwork = useCallback(async () => {
    if (defaultNetworkInfo) {
      changeName(defaultNetworkInfo.networkName);
      changeRPCUrl(defaultNetworkInfo.rpcUrl);
      changeIndexerUrl(defaultNetworkInfo.indexerUrl);
      changeChainId(defaultNetworkInfo.chainId);
      return;
    }

    await deleteNetwork(currentNetworkId);
    goBack();
  }, [currentNetworkId, defaultNetworkInfo]);

  return (
    <CommonFullContentLayout>
      <EditNetwork
        name={name}
        rpcUrl={rpcUrl}
        indexerUrl={indexerUrl}
        chainId={chainId}
        rpcUrlError={rpcUrlError}
        indexerUrlError={indexerUrlError}
        chainIdError={chainIdError}
        savable={savable}
        editType={editType}
        changeName={changeName}
        changeRPCUrl={changeRPCUrl}
        changeIndexerUrl={changeIndexerUrl}
        changeChainId={changeChainId}
        saveNetwork={saveNetwork}
        clearNetwork={clearNetwork}
        moveBack={goBack}
      />
    </CommonFullContentLayout>
  );
};

export default EditCustomNetworkContainer;
