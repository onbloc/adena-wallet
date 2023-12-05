import { useCallback, useState } from 'react';

export type UseCustomNetworkInputReturn = {
  name: string;
  rpcUrl: string;
  chainId: string;
  rpcUrlError: string;
  chainIdError: string;
  changeName: (name: string) => void;
  changeRPCUrl: (rpcUrl: string) => void;
  changeChainId: (chainId: string) => void;
  setRPCUrlError: (error: string) => void;
  setChainIdError: (error: string) => void;
};

export const useCustomNetworkInput = (): UseCustomNetworkInputReturn => {
  const [name, setName] = useState('');
  const [rpcUrl, setRPCUrl] = useState('');
  const [chainId, setChainId] = useState('');
  const [rpcUrlError, setRPCUrlError] = useState('');
  const [chainIdError, setChainIdError] = useState('');

  const changeName = useCallback(
    (name: string) => {
      setName(name);
    },
    [setName],
  );

  const changeRPCUrl = useCallback(
    (rpcUrl: string) => {
      setRPCUrl(rpcUrl.trim());
      setRPCUrlError('');
    },
    [setRPCUrl, setRPCUrlError],
  );

  const changeChainId = useCallback(
    (chainId: string) => {
      setChainId(chainId.trim());
      setChainIdError('');
    },
    [setChainId],
  );

  return {
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
  };
};
