import React, { useCallback, useMemo } from 'react';

import { CommonFullContentLayout } from '@components/atoms';
import AddCustomNetwork from '@components/pages/add-custom-network';
import { useCustomNetworkInput } from '@hooks/use-custom-network-input';
import type { ChainGroup } from '@hooks/use-network';
import { useNetwork } from '@hooks/use-network';

import { AtomoneNetworkMetainfo, NetworkMetainfo, RoutePath } from '@types';
import useAppNavigate from '@hooks/use-app-navigate';

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

const AddCustomNetworkContainer: React.FC = () => {
  const { params, goBack } = useAppNavigate<RoutePath.AddCustomNetwork>();
  const chainGroup: ChainGroup = params?.chainGroup ?? 'gno';
  const { networks, atomoneNetworks, addNetwork } = useNetwork();
  const fieldType = chainGroup === 'atomone' ? 'lcd' : 'indexer';
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
    setChainIdError,
    setExtraUrlError,
  } = useCustomNetworkInput(fieldType);

  const targetNetworks = useMemo<Array<NetworkMetainfo | AtomoneNetworkMetainfo>>(
    () => (chainGroup === 'atomone' ? atomoneNetworks : networks),
    [chainGroup, networks, atomoneNetworks],
  );

  const save = useCallback(async () => {
    let isValid = true;
    if (!isValidURL(rpcUrl)) {
      isValid = false;
      setRPCUrlError('Invalid URL');
    }
    if (fieldType === 'lcd') {
      if (extraUrl.length === 0 || !isValidURL(extraUrl)) {
        isValid = false;
        setExtraUrlError('Invalid URL');
      }
    } else if (extraUrl.length > 0 && !isValidURL(extraUrl)) {
      isValid = false;
      setExtraUrlError('Invalid URL');
    }
    if (existsChainId(chainId, targetNetworks)) {
      isValid = false;
      setChainIdError('Chain ID already in use');
    }
    if (existsRPCUrl(rpcUrl, targetNetworks)) {
      isValid = false;
      setRPCUrlError('RPC URL already in use');
    }
    if (!isValid) {
      return;
    }
    const extra = chainGroup === 'atomone' ? { restUrl: extraUrl } : { indexerUrl: extraUrl };
    await addNetwork(chainGroup, name, rpcUrl, chainId, extra);
    goBack();
  }, [
    chainGroup,
    fieldType,
    targetNetworks,
    name,
    rpcUrl,
    chainId,
    extraUrl,
    addNetwork,
    goBack,
  ]);

  return (
    <CommonFullContentLayout>
      <AddCustomNetwork
        chainGroup={chainGroup}
        name={name}
        rpcUrl={rpcUrl}
        extraUrl={extraUrl}
        chainId={chainId}
        rpcUrlError={rpcUrlError}
        extraUrlError={extraUrlError}
        chainIdError={chainIdError}
        changeName={changeName}
        changeRPCUrl={changeRPCUrl}
        changeExtraUrl={changeExtraUrl}
        changeChainId={changeChainId}
        save={save}
        cancel={goBack}
        moveBack={goBack}
      />
    </CommonFullContentLayout>
  );
};

export default AddCustomNetworkContainer;
