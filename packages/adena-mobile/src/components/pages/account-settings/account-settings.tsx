import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { formatAddress } from '../../../utils/address';
import { Avatar, Button, IconButton } from '../../atoms';
import { ListRow, PasswordSheet, PasswordSheetProps, Screen, SectionLabel, TopBar } from '../../molecules';
import { styles } from './account-settings.styles';

export interface AccountSettingsPageProps {
  name: string;
  address: string;
  sourceLabel: string;
  avatarColor?: string;
  onEditProfile: () => void;
  connectedAppCount: number;
  hasRecoveryPhrase: boolean;
  canRemove: boolean;
  onCopyAddress: () => void;
  onOpenConnectedApps: () => void;
  onOpenRecoveryPhrase: () => void;
  onRequestRemove: () => void;
  // Removing an account is password-gated.
  removeSheet: Omit<PasswordSheetProps, 'title' | 'description' | 'confirmLabel'>;
  onBack: () => void;
}

export const AccountSettingsPage = (props: AccountSettingsPageProps): ReactElement => (
  <Screen
    header={<TopBar title='Account settings' onBack={props.onBack} />}
    footer={props.canRemove && <Button label='Remove account' tone='destructiveText' onPress={props.onRequestRemove} />}
  >
    <ListRow
      leading={<Avatar name={props.name} color={props.avatarColor} />}
      label={props.name}
      description={formatAddress(props.address)}
      value={props.sourceLabel}
      trailing={<IconButton icon='copy' accessibilityLabel='Copy address' size={32} onPress={props.onCopyAddress} />}
      showChevron={false}
    />
    <Button label='Edit profile' tone='secondary' onPress={props.onEditProfile} />
    <View style={styles.section}>
      <SectionLabel label='Account preferences' />
      <View style={styles.rows}>
        <ListRow label='Manage connections' value={String(props.connectedAppCount)} onPress={props.onOpenConnectedApps} />
        {props.hasRecoveryPhrase && <ListRow label='Recovery phrase' onPress={props.onOpenRecoveryPhrase} />}
      </View>
    </View>
    <PasswordSheet
      {...props.removeSheet}
      title='Remove account?'
      description='This removes the account from this device. Imported keys are deleted unless backed up.'
      confirmLabel='Remove'
    />
  </Screen>
);
