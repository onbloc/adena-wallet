import { useCallback, useState } from 'react';

export type UseCustomNetworkInputReturn = {
  name: string;
  rpcUrl: string;
  indexerUrl: string;
  chainId: string;
  rpcUrlError: string;
  indexerUrlError: string;
  chainIdError: string;
  changeName: (name: string) => void;
  changeRPCUrl: (rpcUrl: string) => void;
  changeIndexerUrl: (indexerUrl: string) => void;
  changeChainId: (chainId: string) => void;
  setRPCUrlError: (error: string) => void;
  setIndexerUrlError: (error: string) => void;
  setChainIdError: (error: string) => void;
};

export const useCustomNetworkInput = (): UseCustomNetworkInputReturn => {
  const [name, setName] = useState('');
  const [rpcUrl, setRPCUrl] = useState('');
  const [indexerUrl, setIndexerUrl] = useState('');
  const [chainId, setChainId] = useState('');
  const [rpcUrlError, setRPCUrlError] = useState('');
  const [indexerUrlError, setIndexerUrlError] = useState('');
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

  const changeIndexerUrl = useCallback(
    (rpcUrl: string) => {
      setIndexerUrl(rpcUrl.trim());
      setIndexerUrlError('');
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
  };
};
