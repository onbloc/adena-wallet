import React, { useCallback, useMemo } from 'react';
import { CustomNetworkInputWrapper } from './custom-network-input.styles';

export interface CustomNetworkInputProps {
  name: string;
  rpcUrl: string;
  rpcUrlError?: string;
  indexerUrl: string;
  indexerUrlError?: string;
  chainId: string;
  chainIdError?: string;
  editType?: 'rpc-only' | 'all-default' | 'all';
  changeName: (name: string) => void;
  changeRPCUrl: (rpcUrl: string) => void;
  changeIndexerUrl: (indexerUrl: string) => void;
  changeChainId: (chainId: string) => void;
}

export const CustomNetworkInput: React.FC<CustomNetworkInputProps> = ({
  name,
  rpcUrl,
  indexerUrl,
  chainId,
  rpcUrlError,
  indexerUrlError,
  chainIdError,
  editType,
  changeName,
  changeRPCUrl,
  changeIndexerUrl,
  changeChainId,
}) => {
  const readonlyNetworkName = useMemo(() => {
    return editType === 'rpc-only';
  }, [editType]);

  const readonlyRPCUrl = useMemo(() => {
    return false;
  }, [editType]);

  const readonlyChainId = useMemo(() => {
    return editType === 'rpc-only';
  }, [editType]);

  const readonlyIndexerUrl = useMemo(() => {
    return editType === 'rpc-only';
  }, [editType]);

  const onChangeName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    changeName(event.target.value);
  }, []);

  const onChangeRPCUrl = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    changeRPCUrl(event.target.value.replace(/ /g, ''));
  }, []);

  const onChangeIndexerUrl = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    changeIndexerUrl(event.target.value.replace(/ /g, ''));
  }, []);

  const onChangeChainId = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    changeChainId(event.target.value.replace(/ /g, ''));
  }, []);

  return (
    <CustomNetworkInputWrapper>
      <div className='input-wrapper'>
        <div className='input-box'>
          <input
            type='text'
            value={name}
            autoComplete='off'
            onChange={onChangeName}
            placeholder='Network Name'
            readOnly={readonlyNetworkName}
          />
        </div>
        <div className='input-box'>
          <input
            type='text'
            value={rpcUrl}
            autoComplete='off'
            onChange={onChangeRPCUrl}
            placeholder='RPC URL'
            readOnly={readonlyRPCUrl}
          />
        </div>
        {rpcUrlError && <span className='error-message'>{rpcUrlError}</span>}
        <div className='input-box'>
          <input
            type='text'
            value={chainId}
            autoComplete='off'
            onChange={onChangeChainId}
            placeholder='Chain ID'
            readOnly={readonlyChainId}
          />
        </div>
        {chainIdError && <span className='error-message'>{chainIdError}</span>}
        <div className='input-box'>
          <input
            type='text'
            value={indexerUrl}
            autoComplete='off'
            onChange={onChangeIndexerUrl}
            placeholder='Indexer URL'
            readOnly={readonlyIndexerUrl}
          />
        </div>
        {indexerUrlError && <span className='error-message'>{indexerUrlError}</span>}
      </div>
    </CustomNetworkInputWrapper>
  );
};
