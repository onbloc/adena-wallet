import React, { useCallback } from 'react';
import { AddCustomNetworkFormWrapper } from './add-custom-network-form.styles';

export interface AddCustomNetworkFormProps {
  name: string;
  rpcUrl: string
  hasRPCUrlError: boolean;
  chainId: string;
  onChangeName: (name: string) => void;
  onChangeRPCUrl: (rpcUrl: string) => void;
  onChangeChainId: (chainId: string) => void;
  save: () => void;
  cancel: () => void;
}

const AddCustomNetworkForm: React.FC<AddCustomNetworkFormProps> = ({
  name,
  onChangeName,
  rpcUrl,
  onChangeRPCUrl,
  hasRPCUrlError,
  chainId,
  onChangeChainId,
  save,
  cancel,
}) => {

  const isSavable = useCallback(() => {
    return name.length > 0 &&
      rpcUrl.length > 0 &&
      chainId.length > 0;
  }, [name, rpcUrl, chainId]);

  const onClickSave = useCallback(() => {
    save();
  }, [save]);

  const onClickCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  return (
    <AddCustomNetworkFormWrapper>
      <div className='input-wrapper'>
        <div className='input-box'>
          <input
            type='text'
            value={name}
            autoComplete='off'
            onChange={event => onChangeName(event.target.value)}
            placeholder='Network Name'
          />
        </div>
        <div className='input-box'>
          <input
            type='text'
            value={rpcUrl}
            autoComplete='off'
            onChange={event => onChangeRPCUrl(event.target.value)}
            placeholder='RPC URL'
          />
        </div>
        {
          hasRPCUrlError &&
          <span className='error-message'>{'Invalid URL'}</span>
        }
        <div className='input-box'>
          <input
            type='text'
            value={chainId}
            autoComplete='off'
            onChange={event => onChangeChainId(event.target.value)}
            placeholder='Chain ID'
          />
        </div>
      </div>
      <div className='submit-wrapper'>
        <button
          className='cancel'
          onClick={onClickCancel}>
          {'Cancel'}
        </button>
        <button
          className={isSavable() ? 'save' : 'save disabled'}
          onClick={onClickSave}
        >
          {'Save'}
        </button>
      </div>
    </AddCustomNetworkFormWrapper>
  );
};

export default AddCustomNetworkForm;