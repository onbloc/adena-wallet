import React, { useCallback, useMemo } from 'react';

import { SubHeader, CustomNetworkInput } from '@components/atoms';
import { BottomFixedButtonGroup } from '@components/molecules';
import { EditNetworkWrapper } from './edit-network.styles';
import LeftArrowIcon from '@assets/arrowL-left.svg';
import type { ChainGroup } from '@hooks/use-network';

import RemoveNetworkButton from '../remove-network-button/remove-network-button';

type FieldType = 'indexer' | 'lcd';

export interface EditNetworkProps {
  chainGroup: ChainGroup;
  name: string;
  rpcUrl: string;
  rpcUrlError?: string;
  extraUrl: string;
  extraUrlError?: string;
  chainIdError?: string;
  chainId: string;
  savable: boolean;
  isDefault: boolean;
  changeName: (name: string) => void;
  changeRPCUrl: (rpcUrl: string) => void;
  changeExtraUrl: (extraUrl: string) => void;
  changeChainId: (chainId: string) => void;
  clearNetwork: () => void;
  saveNetwork: () => void;
  moveBack: () => void;
}

const FIELD_TYPES: Record<ChainGroup, FieldType> = {
  gno: 'indexer',
  atomone: 'lcd',
};

const CHAIN_GROUP_DISPLAY_NAMES: Record<ChainGroup, string> = {
  gno: 'Gno.land',
  atomone: 'AtomOne',
};

const EditNetwork: React.FC<EditNetworkProps> = ({
  chainGroup,
  name,
  rpcUrl,
  extraUrl,
  chainId,
  rpcUrlError,
  extraUrlError,
  chainIdError,
  savable,
  isDefault,
  changeName,
  changeRPCUrl,
  changeExtraUrl,
  changeChainId,
  moveBack,
  saveNetwork,
  clearNetwork,
}) => {
  const fieldType = FIELD_TYPES[chainGroup];
  const chainGroupDisplayName = CHAIN_GROUP_DISPLAY_NAMES[chainGroup];
  const clearButtonText = useMemo(() => {
    return isDefault ? 'Reset to Default' : 'Remove Network';
  }, [isDefault]);

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
          <div className='chain-group-label'>{chainGroupDisplayName}</div>
          <CustomNetworkInput
            name={name}
            rpcUrl={rpcUrl}
            extraUrl={extraUrl}
            chainId={chainId}
            rpcUrlError={rpcUrlError}
            extraUrlError={extraUrlError}
            chainIdError={chainIdError}
            changeName={changeName}
            changeRPCUrl={changeRPCUrl}
            changeExtraUrl={changeExtraUrl}
            changeChainId={changeChainId}
            fieldType={fieldType}
            isDefault={isDefault}
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
