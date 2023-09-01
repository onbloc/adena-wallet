import React, { useCallback, useEffect, useMemo } from 'react';
import EditNetwork from '@components/edint-network/edit-network/edit-network';
import { useCustomNetworkInput } from '@hooks/use-custom-network-input';
import { useNetwork } from '@hooks/use-network';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseParmeters } from '@common/utils/client-utils';
import { NetworkMetainfo } from '@states/network';

function isValidURL(rpcURL: string) {
  const regExp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
  return regExp.test(rpcURL);
}

function existsChainId(chainId: string, networks: NetworkMetainfo[]) {
  return networks.findIndex(netowrk => netowrk.networkId === chainId && netowrk.deleted !== true) > -1;
}

function existsRPCUrl(rpcUrl: string, networks: NetworkMetainfo[]) {
  const currentRPCUrl = rpcUrl.endsWith('/') ? rpcUrl.substring(0, rpcUrl.length - 1) : rpcUrl;
  return networks.findIndex(network => network.rpcUrl === currentRPCUrl && network.deleted !== true) > -1;
}

const EditCustomNetworkConatiner: React.FC = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { networkId: currentNetworkId } = parseParmeters(search);
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
  }, [currentNetworkId])

  const originNetwork = useMemo(() => {
    const currentNetwork = networks.find(network => network.id === currentNetworkId);
    return currentNetwork;
  }, [networks, currentNetworkId]);

  const savable = useMemo(() => {
    if (!originNetwork) {
      return false;
    }
    if (
      name === '' ||
      rpcUrl === '' ||
      chainId === ''
    ) {
      return false;
    }
    return (
      originNetwork.networkName !== name ||
      originNetwork.rpcUrl !== rpcUrl ||
      originNetwork.networkId !== chainId
    )
  }, [originNetwork, name, rpcUrl, chainId]);

  function initInput(networkId: string) {
    const network = networks.find(current => current.id === networkId);
    if (network) {
      changeName(network.networkName);
      changeRPCUrl(network.rpcUrl);
      changeChainId(network.chainId);
    }
  }

  const saveNetwork = useCallback(async () => {
    if (!isValidURL(rpcUrl)) {
      setRPCUrlError('Invalid URL');
      return;
    }
    if (existsChainId(chainId, networks)) {
      if (originNetwork?.chainId !== chainId) {
        setChainIdError('Chain ID already in use');
        return;
      }
    }
    if (existsRPCUrl(rpcUrl, networks)) {
      if (originNetwork?.rpcUrl !== rpcUrl) {
        setRPCUrlError('RPC URL already in use');
        return;
      }
    }
    const network = networks.find(current => current.id === currentNetworkId);
    if (network) {
      await updateNetwork({
        ...network,
        chainId: chainId,
        networkId: chainId,
        chainName: name,
        networkName: name,
        rpcUrl
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
  );
};

export default EditCustomNetworkConatiner;