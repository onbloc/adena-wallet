import React, { useCallback, useMemo } from 'react';

import { AddCustomNetworkWrapper } from './add-custom-network.styles';
import LeftArrowIcon from '@assets/arrowL-left.svg';
import { SubHeader, WarningBox, CustomNetworkInput } from '@components/atoms';
import { BottomFixedButtonGroup } from '@components/molecules';

export interface AddCustomNetworkProps {
  name: string;
  rpcUrl: string;
  rpcUrlError?: string;
  indexerUrl: string;
  indexerUrlError?: string;
  chainId: string;
  chainIdError?: string;
  changeName: (name: string) => void;
  changeRPCUrl: (rpcUrl: string) => void;
  changeIndexerUrl: (indexerUrl: string) => void;
  changeChainId: (chainId: string) => void;
  save: () => void;
  cancel: () => void;
  moveBack: () => void;
}

const AddCustomNetwork: React.FC<AddCustomNetworkProps> = ({
  name,
  rpcUrl,
  rpcUrlError,
  indexerUrl,
  indexerUrlError,
  chainId,
  chainIdError,
  changeName,
  changeRPCUrl,
  changeIndexerUrl,
  changeChainId,
  save,
  cancel,
  moveBack,
}) => {
  const isSavable = useMemo(() => {
    if (rpcUrlError) {
      return false;
    }
    return name.length > 0 && rpcUrl.length > 0 && chainId.length > 0;
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
          onClick: onClickBack,
        }}
      />
      <WarningBox type='approachNetwork' padding='10px 18px' margin='12px 0px 20px' />
      <CustomNetworkInput
        name={name}
        rpcUrl={rpcUrl}
        indexerUrl={indexerUrl}
        chainId={chainId}
        changeName={changeName}
        changeRPCUrl={changeRPCUrl}
        indexerUrlError={indexerUrlError}
        changeChainId={changeChainId}
        rpcUrlError={rpcUrlError}
        changeIndexerUrl={changeIndexerUrl}
        chainIdError={chainIdError}
      />
      <BottomFixedButtonGroup
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel,
        }}
        rightButton={{
          primary: true,
          disabled: !isSavable,
          text: 'Save',
          onClick: onClickSave,
        }}
        filled
      />
    </AddCustomNetworkWrapper>
  );
};

export default AddCustomNetwork;
