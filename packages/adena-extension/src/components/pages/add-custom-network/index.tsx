import React, { useCallback, useMemo } from 'react';

import { AddCustomNetworkWrapper } from './add-custom-network.styles';
import LeftArrowIcon from '@assets/arrowL-left.svg';
import { SubHeader, WarningBox, CustomNetworkInput } from '@components/atoms';
import { BottomFixedButtonGroup } from '@components/molecules';
import type { ChainGroup } from '@hooks/use-network';

type FieldType = 'indexer' | 'lcd';

export interface AddCustomNetworkProps {
  chainGroup: ChainGroup;
  name: string;
  rpcUrl: string;
  rpcUrlError?: string;
  extraUrl: string;
  extraUrlError?: string;
  chainId: string;
  chainIdError?: string;
  changeName: (name: string) => void;
  changeRPCUrl: (rpcUrl: string) => void;
  changeExtraUrl: (extraUrl: string) => void;
  changeChainId: (chainId: string) => void;
  save: () => void;
  cancel: () => void;
  moveBack: () => void;
}

const CHAIN_GROUP_DISPLAY_NAMES: Record<ChainGroup, string> = {
  gno: 'Gno.land',
  atomone: 'AtomOne',
};

const FIELD_TYPES: Record<ChainGroup, FieldType> = {
  gno: 'indexer',
  atomone: 'lcd',
};

const AddCustomNetwork: React.FC<AddCustomNetworkProps> = ({
  chainGroup,
  name,
  rpcUrl,
  rpcUrlError,
  extraUrl,
  extraUrlError,
  chainId,
  chainIdError,
  changeName,
  changeRPCUrl,
  changeExtraUrl,
  changeChainId,
  save,
  cancel,
  moveBack,
}) => {
  const fieldType = FIELD_TYPES[chainGroup];
  const chainGroupDisplayName = CHAIN_GROUP_DISPLAY_NAMES[chainGroup];

  const isSavable = useMemo(() => {
    if (rpcUrlError) {
      return false;
    }
    if (fieldType === 'lcd' && extraUrl.length === 0) {
      return false;
    }
    return name.length > 0 && rpcUrl.length > 0 && chainId.length > 0;
  }, [name, rpcUrl, chainId, rpcUrlError, extraUrl, fieldType]);

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
      <div className='chain-group-label'>{chainGroupDisplayName}</div>
      <CustomNetworkInput
        name={name}
        rpcUrl={rpcUrl}
        extraUrl={extraUrl}
        chainId={chainId}
        changeName={changeName}
        changeRPCUrl={changeRPCUrl}
        changeExtraUrl={changeExtraUrl}
        changeChainId={changeChainId}
        rpcUrlError={rpcUrlError}
        extraUrlError={extraUrlError}
        chainIdError={chainIdError}
        fieldType={fieldType}
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
