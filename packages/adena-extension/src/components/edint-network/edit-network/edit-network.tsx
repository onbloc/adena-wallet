import React, { useCallback, useMemo } from 'react';
import { EditNetworkWrapper } from './edit-network.styles';
import SubHeader from '@components/common/sub-header/sub-header';
import LeftArrowIcon from '@assets/arrowL-left.svg';
import CustomNetworkInput from '@components/common/custom-network-form/custom-network-input';
import BottomFixedButtonGroup from '@components/buttons/bottom-fixed-button-group';
import RemoveNetworkButton from '../remove-network-button/remove-network-button';

export interface EditNetworkProps {
  name: string;
  rpcUrl: string
  rpcUrlError?: string;
  chainId: string;
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
  changeName,
  changeRPCUrl,
  changeChainId,
  moveBack,
  saveNetwork,
  removeNetwork
}) => {

  const isSavable = useMemo(() => {
    if (rpcUrlError) {
      return false;
    }
    return (
      name.length > 0 &&
      rpcUrl.length > 0 &&
      chainId.length > 0
    );
  }, [name, rpcUrl, chainId, rpcUrlError]);

  const onClickBack = useCallback(() => {
    moveBack();
  }, [isSavable, moveBack])

  const onClickSave = useCallback(() => {
    if (!isSavable) {
      return;
    }
    saveNetwork();
  }, [isSavable, saveNetwork])

  const onClickRemoveButton = useCallback(() => {
    removeNetwork();
  }, [removeNetwork])

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
          onClick: onClickBack
        }}
        rightButton={{
          primary: true,
          disabled: !isSavable,
          text: 'Save',
          onClick: onClickSave
        }}
      />
    </EditNetworkWrapper>
  );
};

export default EditNetwork;