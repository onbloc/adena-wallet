import React from 'react';
import { AddCustomNetworkWrapper } from './add-custom-network.styles';
import SubHeader from '@components/common/sub-header/sub-header';
import LeftArrowIcon from '@assets/arrowL-left.svg';
import WarningBox from '@components/warning/warning-box';
import AddCustomNetworkForm from '@components/add-custom-network/add-custom-network-form/add-custom-network-form';

export interface AddCustomNetworkProps {
  name: string;
  onChangeName: (name: string) => void;
  rpcUrl: string
  hasRPCUrlError: boolean;
  onChangeRPCUrl: (rpcUrl: string) => void;
  chainId: string;
  onChangeChainId: (chainId: string) => void;
  save: () => void;
  cancel: () => void;
  moveBack: () => void;
}

const AddCustomNetwork: React.FC<AddCustomNetworkProps> = ({
  name,
  onChangeName,
  rpcUrl,
  hasRPCUrlError,
  onChangeRPCUrl,
  chainId,
  onChangeChainId,
  save,
  cancel,
  moveBack,
}) => {

  return (
    <AddCustomNetworkWrapper>
      <SubHeader
        title='Add Custom Network'
        leftElement={{
          element: <img src={LeftArrowIcon} alt={'back icon'} />,
          onClick: moveBack
        }}
      />
      <WarningBox
        type='approachNetwork'
        padding='10px'
        margin='12px 0px 20px'
      />
      <AddCustomNetworkForm
        name={name}
        rpcUrl={rpcUrl}
        chainId={chainId}
        onChangeName={onChangeName}
        onChangeRPCUrl={onChangeRPCUrl}
        onChangeChainId={onChangeChainId}
        hasRPCUrlError={hasRPCUrlError}
        save={save}
        cancel={cancel}
      />
    </AddCustomNetworkWrapper>
  );
};

export default AddCustomNetwork;