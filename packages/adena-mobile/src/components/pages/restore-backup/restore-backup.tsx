import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, IconButton, Radio, Spinner, Text } from '../../atoms';
import { Dialog, EmptyState, InlineAlert, Screen, TextField, TopBar } from '../../molecules';
import { styles } from './restore-backup.styles';

export interface RestoreBackupOption {
  id: string;
  label: string;
}

export type RestoreBackupPageState
  = | { kind: 'loading' }
    | { kind: 'error'; title: string; description: string }
    | { kind: 'empty' }
    | { kind: 'ready'; backups: RestoreBackupOption[]; selectedId: string };

// Deleting before setup has no wallet password to check, so it takes two confirmations.
export type RestoreDeleteStep = 'confirm' | 'confirmAgain';

export interface RestoreBackupPageProps {
  providerName: string;
  state: RestoreBackupPageState;
  onSelect: (id: string) => void;
  password: string;
  onChangePassword: (value: string) => void;
  error?: string;
  submitting: boolean;
  onSubmit: () => void;
  onRetry: () => void;
  onBack: () => void;
  // Shown with the empty state, e.g. while iCloud is still syncing on a new device.
  emptyHint?: string;
  onDeleteBackup?: (id: string) => void;
  deleteStep?: RestoreDeleteStep;
  deleteLabel?: string;
  deleting?: boolean;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
}

const BackupOptions = ({ props, state }: { props: RestoreBackupPageProps; state: Extract<RestoreBackupPageState, { kind: 'ready' }> }): ReactElement => (
  <View style={styles.backups} accessibilityRole={state.backups.length > 1 ? 'radiogroup' : undefined}>
    {state.backups.map(backup => (
      <View key={backup.id} style={styles.option}>
        <View style={styles.optionLabel}>
          {state.backups.length > 1
            ? (
                <Radio
                  label={backup.label}
                  selected={backup.id === state.selectedId}
                  onSelect={() => props.onSelect(backup.id)}
                  disabled={props.submitting}
                />
              )
            : <Text variant='meta' color='secondary'>{backup.label}</Text>}
        </View>
        {props.onDeleteBackup && (
          <IconButton
            icon='trash'
            accessibilityLabel={`Delete ${backup.label}`}
            onPress={() => props.onDeleteBackup?.(backup.id)}
            disabled={props.submitting}
            testID={`restore-backup-delete-${backup.id}`}
          />
        )}
      </View>
    ))}
  </View>
);

export const RestoreBackupPage = (props: RestoreBackupPageProps): ReactElement => {
  const { state, providerName } = props;
  const footer = state.kind === 'ready'
    ? (
        <Button
          label='Continue'
          loadingLabel='Decrypting…'
          disabled={!props.password}
          loading={props.submitting}
          onPress={props.onSubmit}
          testID='restore-backup-submit'
        />
      )
    : state.kind === 'error'
      ? <Button label='Try again' onPress={props.onRetry} testID='restore-backup-retry' />
      : state.kind === 'empty'
        ? <Button label='Check again' tone='secondary' onPress={props.onRetry} testID='restore-backup-check-again' />
        : undefined;

  return (
    <Screen header={<TopBar title={`Restore from ${providerName}`} onBack={props.onBack} />} footer={footer}>
      {state.kind === 'loading' && <View style={styles.loading}><Spinner /></View>}
      {state.kind === 'error' && <InlineAlert tone='error' title={state.title} description={state.description} />}
      {state.kind === 'empty' && (
        <EmptyState
          title='No backup found'
          description={`There is no Adena backup in this ${providerName} account.${props.emptyHint ? ` ${props.emptyHint}` : ''}`}
        />
      )}
      {state.kind === 'ready' && (
        <>
          <Text variant='body' color='secondary'>Enter the backup password you created when you backed up this wallet.</Text>
          <BackupOptions props={props} state={state} />
          <TextField
            label='Backup password'
            value={props.password}
            onChangeText={props.onChangePassword}
            placeholder='Backup password'
            secure
            autoCapitalize='none'
            autoCorrect={false}
            textContentType='none'
            autoComplete='off'
            importantForAutofill='no'
            autoFocus
            onSubmitEditing={props.onSubmit}
            disabled={props.submitting}
            error={props.error}
            testID='restore-backup-password'
          />
        </>
      )}
      <Dialog
        visible={props.deleteStep === 'confirm'}
        title='Delete this backup?'
        description={`${props.deleteLabel ?? 'This backup'} will be removed from ${providerName}. Any wallet in it can then only be recovered with its recovery phrase or private keys.`}
        confirmLabel='Delete'
        destructive
        onConfirm={() => props.onConfirmDelete?.()}
        onCancel={() => props.onCancelDelete?.()}
      />
      <Dialog
        visible={props.deleteStep === 'confirmAgain'}
        title='Delete permanently?'
        description="This can't be undone. Make sure you have the recovery phrase or private keys of every wallet in this backup."
        confirmLabel='Delete permanently'
        destructive
        loading={props.deleting}
        onConfirm={() => props.onConfirmDelete?.()}
        onCancel={() => props.onCancelDelete?.()}
      />
    </Screen>
  );
};
