import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Switch, Text } from '../../atoms';
import { ListRow, Screen, SectionLabel, TopBar } from '../../molecules';
import { styles } from './settings.styles';

export interface SettingsPageProps {
  networkName: string;
  accountCount: number;
  connectedAppCount: number;
  hapticsEnabled: boolean;
  onToggleHaptics: (value: boolean) => void;
  appVersion: string;
  onOpenNetworks: () => void;
  onOpenAccounts: () => void;
  onOpenConnectedApps: () => void;
  onOpenRecoveryPhrase: () => void;
  onOpenChangePassword: () => void;
  onLock: () => void;
  onOpenAddressBook: () => void;
  onOpenReset: () => void;
  onBack: () => void;
}

const SwitchRow = ({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }): ReactElement => (
  <View style={styles.switchRow}>
    <Text variant='row' style={styles.switchLabel}>{label}</Text>
    <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
  </View>
);

export const SettingsPage = (props: SettingsPageProps): ReactElement => (
  <Screen header={<TopBar title='Settings' onBack={props.onBack} />}>
    <SectionLabel label='General' />
    <ListRow label='Network' value={props.networkName} onPress={props.onOpenNetworks} />
    <ListRow label='Accounts' value={String(props.accountCount)} onPress={props.onOpenAccounts} />
    <ListRow label='Connected apps' value={String(props.connectedAppCount)} onPress={props.onOpenConnectedApps} />
    <ListRow label='Address book' onPress={props.onOpenAddressBook} />
    <SwitchRow label='Haptic touch' value={props.hapticsEnabled} onChange={props.onToggleHaptics} />
    <SectionLabel label='Privacy and security' />
    <ListRow label='Change password' onPress={props.onOpenChangePassword} />
    <ListRow label='Recovery phrase' onPress={props.onOpenRecoveryPhrase} />
    <ListRow label='Lock wallet' leadingIcon='lock' onPress={props.onLock} />
    <ListRow label='Reset wallet' destructive onPress={props.onOpenReset} />
    <Text variant='meta' color='secondary' align='center'>{`Version ${props.appVersion}`}</Text>
  </Screen>
);
