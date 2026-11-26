import React, { ReactElement } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Icon, IconButton, Radio, Spinner, Text } from '../../atoms';
import { BottomSheet, Dialog, EmptyState, InlineAlert, ListRow, Screen, TextField, TopBar } from '../../molecules';
import { styles } from './restore-backup.styles';

export interface RestoreBackupOption {
  id: string;
  label: string;
}

export interface RestoreBackupVersionOption {
  id: string;
  label: string;
  description?: string;
}

export type RestoreBackupPageState
  = | { kind: 'loading' }
    | { kind: 'error'; title: string; description: string }
    | { kind: 'empty' }
    | {
      kind: 'ready';
      backups: RestoreBackupOption[];
      selectedId: string;
      // Stored versions of the selected backup, newest first; a picker shows when there is more than one.
      versions?: RestoreBackupVersionOption[];
      selectedVersionId?: string;
    };

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
  // Set after the newest version rejected the password while older versions exist.
  showOlderVersionHint?: boolean;
  versionSheetVisible?: boolean;
  onOpenVersions?: () => void;
  onSelectVersion?: (id: string) => void;
  onCloseVersions?: () => void;
}

type ReadyState = Extract<RestoreBackupPageState, { kind: 'ready' }>;

const VersionPicker = ({ props, state }: { props: RestoreBackupPageProps; state: ReadyState }): ReactElement | null => {
  const versions = state.versions ?? [];
  const selected = versions.find(version => version.id === state.selectedVersionId) ?? versions[0];

  if (versions.length < 2) {
    return null;
  }

  return (
    <>
      <ListRow
        label={selected.label}
        description={selected.description ?? 'Backup version'}
        value='Change'
        onPress={props.onOpenVersions}
        disabled={props.submitting}
        testID='restore-backup-version'
      />
      <BottomSheet
        visible={Boolean(props.versionSheetVisible)}
        title='Choose a version'
        description='Each version opens with the backup password set when it was saved.'
        onClose={() => props.onCloseVersions?.()}
      >
        <View accessibilityRole='radiogroup' style={styles.versions}>
          {versions.map((version) => {
            const isSelected = version.id === selected.id;

            return (
              <Pressable
                key={version.id}
                accessibilityRole='radio'
                accessibilityLabel={[version.label, version.description].filter(Boolean).join(', ')}
                accessibilityState={{ selected: isSelected }}
                onPress={() => props.onSelectVersion?.(version.id)}
                style={styles.version}
                testID={`restore-backup-version-${version.id}`}
              >
                <View style={styles.versionTexts}>
                  <Text variant='row' numberOfLines={1}>{version.label}</Text>
                  {version.description && <Text variant='meta' color='secondary'>{version.description}</Text>}
                </View>
                {isSelected && <Icon name='check' size={20} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
};

const BackupOptions = ({ props, state }: { props: RestoreBackupPageProps; state: ReadyState }): ReactElement => (
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

  // Return submits like the button: never empty, never twice.
  const handleSubmitEditing = (): void => {
    if (props.password && !props.submitting) {
      props.onSubmit();
    }
  };

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
    <Screen header={<TopBar title='Restore backup' onBack={props.onBack} />} footer={footer}>
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
          <Text variant='body' color='secondary'>{`Enter the backup password you created when you backed up this wallet to ${providerName}.`}</Text>
          <BackupOptions props={props} state={state} />
          <VersionPicker props={props} state={state} />
          <TextField
            label='Backup password'
            value={props.password}
            onChangeText={props.onChangePassword}
            placeholder='Backup password'
            secure
            autoFocus
            returnKeyType='go'
            submitBehavior='submit'
            onSubmitEditing={handleSubmitEditing}
            disabled={props.submitting}
            error={props.error}
            testID='restore-backup-password'
          />
          {props.showOlderVersionHint && (state.versions?.length ?? 0) > 1 && (
            <View style={styles.hint}>
              <InlineAlert
                tone='info'
                title='Try an older version'
                description='This backup has older versions. If you set a different backup password before, an older version may open with it.'
              />
              <Button
                label='Choose another version'
                tone='secondary'
                onPress={props.onOpenVersions}
                disabled={props.submitting}
                testID='restore-backup-choose-version'
              />
            </View>
          )}
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
