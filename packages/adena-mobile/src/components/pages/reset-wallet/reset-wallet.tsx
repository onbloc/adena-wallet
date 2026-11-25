import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Checkbox, Text } from '../../atoms';
import { InlineAlert, Screen, TopBar } from '../../molecules';
import { styles } from './reset-wallet.styles';

export interface ResetWalletPageProps {
  acknowledged: boolean;
  onToggleAcknowledged: (value: boolean) => void;
  resetting: boolean;
  error?: string;
  onReset: () => void;
  onBack: () => void;
}

const REMOVED_ITEMS = [
  'Recovery phrases, private keys and the wallet password',
  'All accounts and their names',
  'Address book, token lists and NFT preferences',
  'Connected apps, custom networks and settings',
];

export const ResetWalletPage = ({ acknowledged, onToggleAcknowledged, resetting, error, onReset, onBack }: ResetWalletPageProps): ReactElement => (
  <Screen
    header={<TopBar title='Reset wallet' onBack={onBack} />}
    footer={(
      <Button
        label='Reset wallet'
        tone='destructive'
        loadingLabel='Resetting…'
        disabled={!acknowledged}
        loading={resetting}
        onPress={onReset}
        testID='reset-confirm'
      />
    )}
  >
    <InlineAlert tone='error' title='This cannot be undone' description='Every account can be restored only with its recovery phrase or private key.' />
    <Text variant='row'>The following are removed from this device:</Text>
    <View style={styles.list}>
      {REMOVED_ITEMS.map(item => <Text key={item} variant='body' color='secondary'>{`• ${item}`}</Text>)}
    </View>
    <Text variant='body' color='secondary'>After the reset, Adena starts again from wallet creation.</Text>
    <Checkbox label='I have backed up my recovery phrases' value={acknowledged ? 'on' : 'off'} onChange={onToggleAcknowledged} />
    {error && <InlineAlert tone='error' title='Reset failed' description={error} />}
  </Screen>
);
