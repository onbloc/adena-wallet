import AddCustomNetwork from '@components/add-custom-network/add-custom-network/add-custom-network';
import { useNetwork } from '@hooks/use-network';
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function isValidURL(rpcURL: string) {
  const regExp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
  return regExp.test(rpcURL);
}

const AddCustomNetworkConatiner: React.FC = () => {
  const navigate = useNavigate();
  const { addNetwork } = useNetwork();
  const [name, setName] = useState('');
  const [rpcUrl, setRPCUrl] = useState('');
  const [chainId, setChainId] = useState('');
  const [hasRPCUrlError, setHasRPCUrlError] = useState(false);

  const onChangeName = useCallback((name: string) => {
    setName(name.trim());
  }, [name]);

  const onChangeRPCUrl = useCallback((rpcUrl: string) => {
    setRPCUrl(rpcUrl.trim());
    setHasRPCUrlError(false);
  }, [rpcUrl]);

  const onChangeChainId = useCallback((chainId: string) => {
    setChainId(chainId.trim());
  }, [chainId]);

  const save = useCallback(async () => {
    if (!isValidURL(rpcUrl)) {
      setHasRPCUrlError(true);
      return;
    }
    await addNetwork(name, rpcUrl, chainId);
    navigate(-1);
  }, [name, rpcUrl, chainId]);

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
      onChangeName={onChangeName}
      onChangeRPCUrl={onChangeRPCUrl}
      onChangeChainId={onChangeChainId}
      hasRPCUrlError={hasRPCUrlError}
      save={save}
      cancel={cancel}
      moveBack={moveBack}
    />
  );
};

export default AddCustomNetworkConatiner;