import React, { ReactElement } from 'react';

import { Avatar, Button } from '../../atoms';
import { AddressRow, Card, ListRow, PasswordSheet, PasswordSheetProps, Screen, SectionLabel, TextField, TopBar } from '../../molecules';

export interface AccountSettingsPageProps {
  name: string;
  address: string;
  sourceLabel: string;
  editingName: string;
  onChangeEditingName: (value: string) => void;
  onSaveName: () => void;
  canSaveName: boolean;
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
  <Screen header={<TopBar title='Account settings' onBack={props.onBack} />}>
    <Card>
      <ListRow leading={<Avatar name={props.name} />} label={props.name} description={props.sourceLabel} showChevron={false} />
      <AddressRow address={props.address} onCopy={props.onCopyAddress} full />
    </Card>
    <TextField label='Account name' value={props.editingName} onChangeText={props.onChangeEditingName} helper='Shown only on this device.' />
    <Button label='Save name' tone='secondary' disabled={!props.canSaveName} onPress={props.onSaveName} />
    <SectionLabel label='Account preferences' />
    <ListRow label='Manage connections' onPress={props.onOpenConnectedApps} />
    {props.hasRecoveryPhrase && <ListRow label='Recovery phrase' onPress={props.onOpenRecoveryPhrase} />}
    {props.canRemove && <ListRow label='Remove account' destructive showChevron={false} onPress={props.onRequestRemove} />}
    <PasswordSheet
      {...props.removeSheet}
      title='Remove account?'
      description='This removes the account from this device. Imported keys are deleted unless backed up.'
      confirmLabel='Remove'
    />
  </Screen>
);
