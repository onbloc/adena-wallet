import React, { useCallback, useMemo } from 'react';

import { SubHeader, CustomNetworkInput } from '@components/atoms';
import { BottomFixedButtonGroup } from '@components/molecules';
import { EditNetworkWrapper } from './edit-network.styles';
import LeftArrowIcon from '@assets/arrowL-left.svg';

import RemoveNetworkButton from '../remove-network-button/remove-network-button';

export interface EditNetworkProps {
  name: string;
  rpcUrl: string;
  rpcUrlError?: string;
  indexerUrl: string;
  indexerUrlError?: string;
  chainIdError?: string;
  chainId: string;
  savable: boolean;
  editType: 'rpc-only' | 'all-default' | 'all';
  changeName: (name: string) => void;
  changeRPCUrl: (rpcUrl: string) => void;
  changeIndexerUrl: (indexerUrl: string) => void;
  changeChainId: (chainId: string) => void;
  clearNetwork: () => void;
  saveNetwork: () => void;
  moveBack: () => void;
}

const EditNetwork: React.FC<EditNetworkProps> = ({
  name,
  rpcUrl,
  indexerUrl,
  chainId,
  rpcUrlError,
  indexerUrlError,
  chainIdError,
  savable,
  editType,
  changeName,
  changeRPCUrl,
  changeIndexerUrl,
  changeChainId,
  moveBack,
  saveNetwork,
  clearNetwork,
}) => {
  const clearButtonText = useMemo(() => {
    if (editType === 'all') {
      return 'Remove Network';
    }
    return 'Reset to Default';
  }, [editType]);

  const onClickBack = useCallback(() => {
    moveBack();
  }, [moveBack]);

  const onClickSave = useCallback(() => {
    if (!savable) {
      return;
    }
    saveNetwork();
  }, [savable, saveNetwork]);

  const onClickRemoveButton = useCallback(() => {
    clearNetwork();
  }, [clearNetwork]);

  return (
    <EditNetworkWrapper>
      <div className='content-wrapper'>
        <SubHeader
          title='Edit Network'
          leftElement={{
            element: <img src={LeftArrowIcon} alt={'back icon'} />,
            onClick: onClickBack,
          }}
        />
        <div className='form-wrapper'>
          <CustomNetworkInput
            name={name}
            rpcUrl={rpcUrl}
            indexerUrl={indexerUrl}
            chainId={chainId}
            rpcUrlError={rpcUrlError}
            indexerUrlError={indexerUrlError}
            chainIdError={chainIdError}
            changeName={changeName}
            changeRPCUrl={changeRPCUrl}
            changeIndexerUrl={changeIndexerUrl}
            changeChainId={changeChainId}
            editType={editType}
          />
        </div>
        <RemoveNetworkButton text={clearButtonText} clearNetwork={onClickRemoveButton} />
      </div>
      <BottomFixedButtonGroup
        leftButton={{
          text: 'Cancel',
          onClick: onClickBack,
        }}
        rightButton={{
          primary: true,
          disabled: !savable,
          text: 'Save',
          onClick: onClickSave,
        }}
      />
    </EditNetworkWrapper>
  );
};

export default EditNetwork;
