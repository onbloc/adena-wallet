import { useCallback, useState } from 'react';

export const useCustomNetworkInput = () => {
  const [name, setName] = useState('');
  const [rpcUrl, setRPCUrl] = useState('');
  const [chainId, setChainId] = useState('');
  const [rpcUrlError, setRPCUrlError] = useState('');

  const changeName = useCallback((name: string) => {
    setName(name.trim());
  }, [setName]);

  const changeRPCUrl = useCallback((rpcUrl: string) => {
    setRPCUrl(rpcUrl.trim());
    setRPCUrlError('');
  }, [setRPCUrl, setRPCUrlError]);

  const changeChainId = useCallback((chainId: string) => {
    setChainId(chainId.trim());
  }, [setChainId]);

  return {
    name,
    rpcUrl,
    chainId,
    rpcUrlError,
    changeName,
    changeRPCUrl,
    changeChainId,
    setRPCUrlError,
  };
};
