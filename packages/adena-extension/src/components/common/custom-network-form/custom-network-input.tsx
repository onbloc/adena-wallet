import React, { useCallback } from 'react';
import { CustomNetworkInputWrapper } from './custom-network-input.styles';

export interface CustomNetworkInputProps {
  name: string;
  rpcUrl: string
  rpcUrlError?: string;
  chainId: string;
  changeName: (name: string) => void;
  changeRPCUrl: (rpcUrl: string) => void;
  changeChainId: (chainId: string) => void;
}

const CustomNetworkInput: React.FC<CustomNetworkInputProps> = ({
  name,
  rpcUrl,
  chainId,
  rpcUrlError,
  changeName,
  changeRPCUrl,
  changeChainId,
}) => {

  const onChangeName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    changeName(event.target.value);
  }, [])

  const onChangeRPCUrl = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    changeRPCUrl(event.target.value);
  }, [])

  const onChangeChainId = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    changeChainId(event.target.value);
  }, [])

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
          />
        </div>
        <div className='input-box'>
          <input
            type='text'
            value={rpcUrl}
            autoComplete='off'
            onChange={onChangeRPCUrl}
            placeholder='RPC URL'
          />
        </div>
        {
          rpcUrlError &&
          <span className='error-message'>{rpcUrlError}</span>
        }
        <div className='input-box'>
          <input
            type='text'
            value={chainId}
            autoComplete='off'
            onChange={onChangeChainId}
            placeholder='Chain ID'
          />
        </div>
      </div>
    </CustomNetworkInputWrapper>
  );
};

export default CustomNetworkInput;