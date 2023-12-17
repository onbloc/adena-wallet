import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import EditNetwork from '@components/pages/edit-network/edit-network';
import { useCustomNetworkInput } from '@hooks/use-custom-network-input';
import { useNetwork } from '@hooks/use-network';
import { parseParameters } from '@common/utils/client-utils';
import { CommonFullContentLayout } from '@components/atoms';

import { NetworkMetainfo } from '@types';

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
  const navigate = useNavigate();
  const { search } = useLocation();
  const { networkId: currentNetworkId } = parseParameters(search);
  const { networks, updateNetwork, deleteNetwork } = useNetwork();
  const {
    name,
    rpcUrl,
    chainId,
    rpcUrlError,
    chainIdError,
    changeName,
    changeRPCUrl,
    changeChainId,
    setRPCUrlError,
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
      originNetwork.networkId !== chainId
    );
  }, [originNetwork, name, rpcUrl, chainId]);

  function initInput(networkId: string): void {
    const network = networks.find((current) => current.id === networkId);
    if (network) {
      changeName(network.networkName);
      changeRPCUrl(network.rpcUrl);
      changeChainId(network.chainId);
    }
  }

  const saveNetwork = useCallback(async () => {
    let isValid = true;
    if (!isValidURL(rpcUrl)) {
      isValid = false;
      setRPCUrlError('Invalid URL');
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
      });
    }
    setRPCUrlError('');
    setChainIdError('');
    navigate(-1);
  }, [networks, name, rpcUrl, chainId, currentNetworkId, originNetwork]);

  const removeNetwork = useCallback(async () => {
    await deleteNetwork(currentNetworkId);
    navigate(-1);
  }, [currentNetworkId]);

  const moveBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <CommonFullContentLayout>
      <EditNetwork
        name={name}
        rpcUrl={rpcUrl}
        chainId={chainId}
        rpcUrlError={rpcUrlError}
        chainIdError={chainIdError}
        savable={savable}
        changeName={changeName}
        changeRPCUrl={changeRPCUrl}
        changeChainId={changeChainId}
        saveNetwork={saveNetwork}
        removeNetwork={removeNetwork}
        moveBack={moveBack}
      />
    </CommonFullContentLayout>
  );
};

export default EditCustomNetworkContainer;
