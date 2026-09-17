import React, { useCallback, useEffect, useMemo } from 'react';

import EditNetwork from '@components/pages/edit-network/edit-network';
import { useCustomNetworkInput } from '@hooks/use-custom-network-input';
import type { ChainGroup } from '@hooks/use-network';
import { useNetwork } from '@hooks/use-network';
import { CommonFullContentLayout } from '@components/atoms';

import { AtomoneNetworkMetainfo, NetworkMetainfo } from '@types';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

function isValidURL(url: string): boolean {
  const regExp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
  return regExp.test(url);
}

function existsChainId(
  chainId: string,
  networks: Array<NetworkMetainfo | AtomoneNetworkMetainfo>,
): boolean {
  return (
    networks.findIndex((network) => network.networkId === chainId && network.deleted !== true) > -1
  );
}

function existsRPCUrl(
  rpcUrl: string,
  networks: Array<NetworkMetainfo | AtomoneNetworkMetainfo>,
): boolean {
  const currentRPCUrl = rpcUrl.endsWith('/') ? rpcUrl.substring(0, rpcUrl.length - 1) : rpcUrl;
  return (
    networks.findIndex((network) => network.rpcUrl === currentRPCUrl && network.deleted !== true) >
    -1
  );
}

const EditCustomNetworkContainer: React.FC = () => {
  const { params, goBack } = useAppNavigate<RoutePath.EditCustomNetwork>();
  const currentNetworkId = params.networkId;
  const chainGroup: ChainGroup = params.chainGroup;
  const fieldType = chainGroup === 'atomone' ? 'lcd' : 'indexer';
  const { networks, atomoneNetworks, updateNetwork, resetNetworkToDefault, deleteNetwork } =
    useNetwork();
  const {
    name,
    rpcUrl,
    extraUrl,
    chainId,
    rpcUrlError,
    extraUrlError,
    chainIdError,
    changeName,
    changeRPCUrl,
    changeExtraUrl,
    changeChainId,
    setRPCUrlError,
    setExtraUrlError,
    setChainIdError,
  } = useCustomNetworkInput(fieldType);

  const targetNetworks = useMemo<Array<NetworkMetainfo | AtomoneNetworkMetainfo>>(
    () => (chainGroup === 'atomone' ? atomoneNetworks : networks),
    [chainGroup, networks, atomoneNetworks],
  );

  const originNetwork = useMemo(() => {
    return targetNetworks.find((network) => network.id === currentNetworkId);
  }, [targetNetworks, currentNetworkId]);

  const originExtraUrl = useMemo(() => {
    if (!originNetwork) return '';
    if (chainGroup === 'atomone') {
      return (originNetwork as AtomoneNetworkMetainfo).restUrl ?? '';
    }
    return (originNetwork as NetworkMetainfo).indexerUrl ?? '';
  }, [originNetwork, chainGroup]);

  useEffect(() => {
    if (!originNetwork) return;
    changeName(originNetwork.networkName);
    changeRPCUrl(originNetwork.rpcUrl);
    changeExtraUrl(originExtraUrl);
    changeChainId(originNetwork.chainId);
  }, [currentNetworkId, originNetwork]);

  const isDefault = useMemo(() => !!originNetwork?.default, [originNetwork]);

  const savable = useMemo(() => {
    if (!originNetwork) {
      return false;
    }
    if (name === '' || rpcUrl === '' || chainId === '') {
      return false;
    }
    if (chainGroup === 'atomone' && extraUrl === '') {
      return false;
    }
    return (
      originNetwork.networkName !== name ||
      originNetwork.rpcUrl !== rpcUrl ||
      originExtraUrl !== extraUrl ||
      originNetwork.networkId !== chainId
    );
  }, [originNetwork, originExtraUrl, chainGroup, name, rpcUrl, extraUrl, chainId]);

  const saveNetwork = useCallback(async () => {
    let isValid = true;
    if (!isValidURL(rpcUrl)) {
      isValid = false;
      setRPCUrlError('Invalid URL');
    }
    if (chainGroup === 'atomone') {
      if (extraUrl.length === 0 || !isValidURL(extraUrl)) {
        isValid = false;
        setExtraUrlError('Invalid URL');
      }
    } else if (extraUrl.length > 0 && !isValidURL(extraUrl)) {
      isValid = false;
      setExtraUrlError('Invalid URL');
    }
    if (existsChainId(chainId, targetNetworks) && originNetwork?.chainId !== chainId) {
      isValid = false;
      setChainIdError('Chain ID already in use');
    }
    if (existsRPCUrl(rpcUrl, targetNetworks) && originNetwork?.rpcUrl !== rpcUrl) {
      isValid = false;
      setRPCUrlError('RPC URL already in use');
    }
    if (!isValid || !originNetwork) {
      return;
    }
    const parsedName = name.trim();
    if (chainGroup === 'atomone') {
      await updateNetwork({
        ...(originNetwork as AtomoneNetworkMetainfo),
        chainId,
        networkId: chainId,
        chainName: parsedName,
        networkName: parsedName,
        rpcUrl,
        restUrl: extraUrl,
      });
    } else {
      await updateNetwork({
        ...(originNetwork as NetworkMetainfo),
        chainId,
        networkId: chainId,
        chainName: parsedName,
        networkName: parsedName,
        rpcUrl,
        indexerUrl: extraUrl,
      });
    }
    setRPCUrlError('');
    setChainIdError('');
    goBack();
  }, [
    chainGroup,
    targetNetworks,
    originNetwork,
    name,
    rpcUrl,
    extraUrl,
    chainId,
    updateNetwork,
    goBack,
  ]);

  const clearNetwork = useCallback(async () => {
    if (isDefault && originNetwork) {
      await resetNetworkToDefault(chainGroup, currentNetworkId);
      goBack();
      return;
    }
    await deleteNetwork(chainGroup, currentNetworkId);
    goBack();
  }, [
    chainGroup,
    isDefault,
    originNetwork,
    currentNetworkId,
    resetNetworkToDefault,
    deleteNetwork,
    goBack,
  ]);

  return (
    <CommonFullContentLayout>
      <EditNetwork
        chainGroup={chainGroup}
        name={name}
        rpcUrl={rpcUrl}
        extraUrl={extraUrl}
        chainId={chainId}
        rpcUrlError={rpcUrlError}
        extraUrlError={extraUrlError}
        chainIdError={chainIdError}
        savable={savable}
        isDefault={isDefault}
        changeName={changeName}
        changeRPCUrl={changeRPCUrl}
        changeExtraUrl={changeExtraUrl}
        changeChainId={changeChainId}
        saveNetwork={saveNetwork}
        clearNetwork={clearNetwork}
        moveBack={goBack}
      />
    </CommonFullContentLayout>
  );
};

export default EditCustomNetworkContainer;
