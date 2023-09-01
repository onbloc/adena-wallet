import AddCustomNetwork from '@components/add-custom-network/add-custom-network/add-custom-network';
import { useCustomNetworkInput } from '@hooks/use-custom-network-input';
import { useNetwork } from '@hooks/use-network';
import { NetworkMetainfo } from '@states/network';
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function isValidURL(rpcUrl: string) {
  const regExp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
  return regExp.test(rpcUrl);
}

function existsChainId(chainId: string, networks: NetworkMetainfo[]) {
  return networks.findIndex(netowrk => netowrk.networkId === chainId && netowrk.deleted !== true) > -1;
}

function existsRPCUrl(rpcUrl: string, networks: NetworkMetainfo[]) {
  const currentRPCUrl = rpcUrl.endsWith('/') ? rpcUrl.substring(0, rpcUrl.length - 1) : rpcUrl;
  return networks.findIndex(network => network.rpcUrl === currentRPCUrl && network.deleted !== true) > -1;
}

const AddCustomNetworkConatiner: React.FC = () => {
  const navigate = useNavigate();
  const { networks, addNetwork } = useNetwork();
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

  const save = useCallback(async () => {
    if (!isValidURL(rpcUrl)) {
      setRPCUrlError('Invalid URL');
      return;
    }
    if (existsChainId(chainId, networks)) {
      setChainIdError('Chain ID already in use');
      return;
    }
    if (existsRPCUrl(rpcUrl, networks)) {
      setRPCUrlError('RPC URL already in use');
      return;
    }
    await addNetwork(name, rpcUrl, chainId);
    navigate(-1);
  }, [networks, name, rpcUrl, chainId]);

  const cancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const moveBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <AddCustomNetwork
      name={name}
      rpcUrl={rpcUrl}
      chainId={chainId}
      rpcUrlError={rpcUrlError}
      chainIdError={chainIdError}
      changeName={changeName}
      changeRPCUrl={changeRPCUrl}
      changeChainId={changeChainId}
      save={save}
      cancel={cancel}
      moveBack={moveBack}
    />
  );
};

export default AddCustomNetworkConatiner;