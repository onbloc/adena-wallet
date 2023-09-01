import React, { useCallback, useMemo } from 'react';
import { AddCustomNetworkWrapper } from './add-custom-network.styles';
import SubHeader from '@components/common/sub-header/sub-header';
import LeftArrowIcon from '@assets/arrowL-left.svg';
import WarningBox from '@components/warning/warning-box';
import CustomNetworkInput from '@components/common/custom-network-form/custom-network-input';
import BottomFixedButtonGroup from '@components/buttons/bottom-fixed-button-group';

export interface AddCustomNetworkProps {
  name: string;
  rpcUrl: string
  rpcUrlError?: string;
  chainId: string;
  chainIdError?: string;
  changeName: (name: string) => void;
  changeRPCUrl: (rpcUrl: string) => void;
  changeChainId: (chainId: string) => void;
  save: () => void;
  cancel: () => void;
  moveBack: () => void;
}

const AddCustomNetwork: React.FC<AddCustomNetworkProps> = ({
  name,
  rpcUrl,
  rpcUrlError,
  chainId,
  chainIdError,
  changeName,
  changeRPCUrl,
  changeChainId,
  save,
  cancel,
  moveBack,
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
  }, [moveBack]);

  const onClickCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  const onClickSave = useCallback(() => {
    if (!isSavable) {
      return;
    }
    save();
  }, [isSavable, save]);

  return (
    <AddCustomNetworkWrapper>
      <SubHeader
        title='Add Custom Network'
        leftElement={{
          element: <img src={LeftArrowIcon} alt={'back icon'} />,
          onClick: onClickBack
        }}
      />
      <WarningBox
        type='approachNetwork'
        padding='10px 18px'
        margin='12px 0px 20px'
      />
      <CustomNetworkInput
        name={name}
        rpcUrl={rpcUrl}
        chainId={chainId}
        changeName={changeName}
        changeRPCUrl={changeRPCUrl}
        changeChainId={changeChainId}
        rpcUrlError={rpcUrlError}
        chainIdError={chainIdError}
      />
      <BottomFixedButtonGroup
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel
        }}
        rightButton={{
          primary: true,
          disabled: !isSavable,
          text: 'Save',
          onClick: onClickSave
        }}
      />
    </AddCustomNetworkWrapper>
  );
};

export default AddCustomNetwork;