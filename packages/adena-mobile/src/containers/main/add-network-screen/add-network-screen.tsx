import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { AddNetworkPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { ChainFamily } from '../../../domain/network';
import { MainStackParamList } from '../../../navigation/types';
import { useSessionStore } from '../../../stores/session.store';

export const AddNetworkScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'AddNetwork'>): ReactElement => {
  const { networkService } = useContainer();
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const baseNetworks = networkService.getNetworks().filter(network => !network.isCustom);
  const [baseIndex, setBaseIndex] = useState(0);
  const [name, setName] = useState('');
  const [rpcUrl, setRpcUrl] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const base = baseNetworks[baseIndex];

  const handleChangeRpcUrl = (value: string): void => {
    setRpcUrl(value);
    setError(undefined);
  };

  const handleSelectBaseNetwork = (): void => setBaseIndex(index => (index + 1) % baseNetworks.length);

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);

    try {
      const network = await networkService.addCustomNetwork({ networkName: name, rpcUrl, baseNetworkId: base.id });

      networkService.selectNetwork(network.id);
      bumpRevision();
      navigation.pop(2);
    }
    catch (submitError) {
      setError(toErrorMessage(submitError));
    }
    finally {
      setSubmitting(false);
    }
  };

  return (
    <AddNetworkPage
      name={name}
      rpcUrl={rpcUrl}
      baseNetworkName={`${base.chainName} (${base.networkName})`}
      endpointLabel={base.family === ChainFamily.COSMOS ? 'REST (LCD) URL' : 'RPC URL'}
      onChangeName={setName}
      onChangeRpcUrl={handleChangeRpcUrl}
      onSelectBaseNetwork={handleSelectBaseNetwork}
      error={error}
      submitting={submitting}
      onSubmit={handleSubmit}
      onBack={navigation.goBack}
    />
  );
};
