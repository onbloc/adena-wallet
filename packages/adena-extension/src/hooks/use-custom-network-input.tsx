import { useCallback, useState } from 'react';

export type CustomNetworkFieldType = 'indexer' | 'lcd';

export type UseCustomNetworkInputReturn = {
  name: string;
  rpcUrl: string;
  extraUrl: string;
  chainId: string;
  rpcUrlError: string;
  extraUrlError: string;
  chainIdError: string;
  fieldType: CustomNetworkFieldType;
  changeName: (name: string) => void;
  changeRPCUrl: (rpcUrl: string) => void;
  changeExtraUrl: (extraUrl: string) => void;
  changeChainId: (chainId: string) => void;
  setRPCUrlError: (error: string) => void;
  setExtraUrlError: (error: string) => void;
  setChainIdError: (error: string) => void;
};

export const useCustomNetworkInput = (
  fieldType: CustomNetworkFieldType = 'indexer',
): UseCustomNetworkInputReturn => {
  const [name, setName] = useState('');
  const [rpcUrl, setRPCUrl] = useState('');
  const [extraUrl, setExtraUrl] = useState('');
  const [chainId, setChainId] = useState('');
  const [rpcUrlError, setRPCUrlError] = useState('');
  const [extraUrlError, setExtraUrlError] = useState('');
  const [chainIdError, setChainIdError] = useState('');

  const changeName = useCallback((name: string) => {
    setName(name);
  }, []);

  const changeRPCUrl = useCallback((nextUrl: string) => {
    setRPCUrl(nextUrl.trim());
    setRPCUrlError('');
  }, []);

  const changeExtraUrl = useCallback((nextUrl: string) => {
    setExtraUrl(nextUrl.trim());
    setExtraUrlError('');
  }, []);

  const changeChainId = useCallback((nextId: string) => {
    setChainId(nextId.trim());
    setChainIdError('');
  }, []);

  return {
    name,
    rpcUrl,
    extraUrl,
    chainId,
    rpcUrlError,
    extraUrlError,
    chainIdError,
    fieldType,
    changeName,
    changeRPCUrl,
    changeExtraUrl,
    changeChainId,
    setRPCUrlError,
    setExtraUrlError,
    setChainIdError,
  };
};
