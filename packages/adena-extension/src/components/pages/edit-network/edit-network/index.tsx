import React, { useCallback } from 'react';

import { SubHeader, CustomNetworkInput } from '@components/atoms';
import { BottomFixedButtonGroup } from '@components/molecules';
import { EditNetworkWrapper } from './edit-network.styles';
import LeftArrowIcon from '@assets/arrowL-left.svg';

import RemoveNetworkButton from '../remove-network-button/remove-network-button';

export interface EditNetworkProps {
  name: string;
  rpcUrl: string;
  rpcUrlError?: string;
  chainIdError?: string;
  chainId: string;
  savable: boolean;
  changeName: (name: string) => void;
  changeRPCUrl: (rpcUrl: string) => void;
  changeChainId: (chainId: string) => void;
  removeNetwork: () => void;
  saveNetwork: () => void;
  moveBack: () => void;
}

const EditNetwork: React.FC<EditNetworkProps> = ({
  name,
  rpcUrl,
  chainId,
  rpcUrlError,
  chainIdError,
  savable,
  changeName,
  changeRPCUrl,
  changeChainId,
  moveBack,
  saveNetwork,
  removeNetwork,
}) => {
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
    removeNetwork();
  }, [removeNetwork]);

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
            chainId={chainId}
            rpcUrlError={rpcUrlError}
            chainIdError={chainIdError}
            changeName={changeName}
            changeRPCUrl={changeRPCUrl}
            changeChainId={changeChainId}
          />
        </div>
        <RemoveNetworkButton removeNetwork={onClickRemoveButton} />
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
