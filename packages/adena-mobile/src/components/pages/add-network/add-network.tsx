import React, { ReactElement, useRef } from 'react';
import { TextInputInstance } from 'react-native';

import { Button, Text } from '../../atoms';
import { Screen, SelectField, TextField, TopBar } from '../../molecules';

export interface AddNetworkPageProps {
  name: string;
  rpcUrl: string;
  baseNetworkName: string;
  endpointLabel: string;
  onChangeName: (value: string) => void;
  onChangeRpcUrl: (value: string) => void;
  onSelectBaseNetwork: () => void;
  error?: string;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export const AddNetworkPage = (props: AddNetworkPageProps): ReactElement => {
  const rpcRef = useRef<TextInputInstance>(null);
  const canSubmit = Boolean(props.name.trim() && props.rpcUrl.trim()) && !props.submitting;

  const handleSubmitEditing = (): void => {
    if (canSubmit) {
      props.onSubmit();
    }
  };

  return (
    <Screen
      header={<TopBar title='Add network' onBack={props.onBack} />}
      footer={(
        <Button
          label='Add network'
          loadingLabel='Checking node…'
          disabled={!props.name.trim() || !props.rpcUrl.trim()}
          loading={props.submitting}
          onPress={props.onSubmit}
        />
      )}
    >
      <Text variant='body' color='secondary'>The chain ID is read from the node before the network is saved.</Text>
      <SelectField label='Chain type' value={props.baseNetworkName} placeholder='Select a base network' onPress={props.onSelectBaseNetwork} />
      <TextField
        label='Network name'
        value={props.name}
        onChangeText={props.onChangeName}
        placeholder='My Gno node'
        autoCapitalize='words'
        returnKeyType='next'
        submitBehavior='submit'
        onSubmitEditing={() => rpcRef.current?.focus()}
      />
      <TextField
        ref={rpcRef}
        label={props.endpointLabel}
        value={props.rpcUrl}
        onChangeText={props.onChangeRpcUrl}
        placeholder='https://rpc.example.com:443'
        autoCapitalize='none'
        autoCorrect={false}
        keyboardType='url'
        textContentType='URL'
        returnKeyType='go'
        submitBehavior='blurAndSubmit'
        onSubmitEditing={handleSubmitEditing}
        error={props.error}
      />
    </Screen>
  );
};
