import React, { useCallback, useEffect } from 'react';
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

function existsRPCUrl(networks: NetworkMetainfo[], rpcURL: string) {
  return networks.some(network => network.rpcUrl === rpcURL);
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
    setRPCUrlError,
    changeName,
    changeRPCUrl,
    changeChainId,
  } = useCustomNetworkInput();

  useEffect(() => {
    initInput(currentNetworkId);
  }, [currentNetworkId])

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
    if (existsRPCUrl(networks, rpcUrl)) {
      setRPCUrlError('RPC URL already in use');
      return;
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
    navigate(-1);
  }, [networks, name, rpcUrl, chainId, currentNetworkId]);

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