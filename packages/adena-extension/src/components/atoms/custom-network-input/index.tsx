import React, { useCallback, useMemo } from 'react';
import { CustomNetworkInputWrapper } from './custom-network-input.styles';

export type CustomNetworkFieldType = 'indexer' | 'lcd';

export interface CustomNetworkInputProps {
  name: string;
  rpcUrl: string;
  rpcUrlError?: string;
  extraUrl: string;
  extraUrlError?: string;
  chainId: string;
  chainIdError?: string;
  fieldType: CustomNetworkFieldType;
  isDefault?: boolean;
  changeName: (name: string) => void;
  changeRPCUrl: (rpcUrl: string) => void;
  changeExtraUrl: (extraUrl: string) => void;
  changeChainId: (chainId: string) => void;
}

const EXTRA_URL_PLACEHOLDER: Record<CustomNetworkFieldType, string> = {
  indexer: 'Indexer URL (Optional)',
  lcd: 'LCD URL',
};

export const CustomNetworkInput: React.FC<CustomNetworkInputProps> = ({
  name,
  rpcUrl,
  extraUrl,
  chainId,
  rpcUrlError,
  extraUrlError,
  chainIdError,
  fieldType,
  isDefault,
  changeName,
  changeRPCUrl,
  changeExtraUrl,
  changeChainId,
}) => {
  const readonlyNetworkName = useMemo(() => !!isDefault, [isDefault]);
  const readonlyChainId = useMemo(() => !!isDefault, [isDefault]);
  const extraUrlPlaceholder = useMemo(() => EXTRA_URL_PLACEHOLDER[fieldType], [fieldType]);

  const onChangeName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      changeName(event.target.value);
    },
    [changeName],
  );

  const onChangeRPCUrl = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      changeRPCUrl(event.target.value.replace(/ /g, ''));
    },
    [changeRPCUrl],
  );

  const onChangeExtraUrl = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      changeExtraUrl(event.target.value.replace(/ /g, ''));
    },
    [changeExtraUrl],
  );

  const onChangeChainId = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      changeChainId(event.target.value.replace(/ /g, ''));
    },
    [changeChainId],
  );

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
            value={extraUrl}
            autoComplete='off'
            onChange={onChangeExtraUrl}
            placeholder={extraUrlPlaceholder}
          />
        </div>
        {extraUrlError && <span className='error-message'>{extraUrlError}</span>}
      </div>
    </CustomNetworkInputWrapper>
  );
};
