import React, { ReactElement, useRef } from 'react';
import { TextInputInstance, View } from 'react-native';

import { useThemeColors } from '../../../theme';
import { Button, Icon, IconButton, Spinner, Text, TextColor } from '../../atoms';
import { Dialog, InlineAlert, PasswordSheet, PasswordSheetProps, Screen, TextField, TopBar } from '../../molecules';
import { useStyles } from './cloud-backup.styles';

export type CloudBackupPageState
  = | { kind: 'loading' }
    | { kind: 'error'; title: string; description: string }
    | { kind: 'none' }
    | {
      kind: 'backedUp';
      backedUpAt: string;
      outdated: boolean;
      items: string[];
      remoteChange?: { title: string; description: string };
      // Saved on this device and still uploading; `error` is why the upload has not finished.
      upload?: { error?: { title: string; description: string } };
    };

// Every Adena backup in this cloud account, including ones from other wallets.
export interface CloudBackupListItem {
  id: string;
  label: string;
  current: boolean;
}

export type StrengthColor = Extract<TextColor, 'error' | 'warning' | 'success'>;

export interface BackupPasswordFormProps {
  password: string;
  confirmPassword: string;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  // `level` 1~3 fills the meter; the label is "weak" exactly when the policy rejects the password.
  strength?: { label: string; color: StrengthColor; level?: number };
  passwordError?: string;
  confirmError?: string;
  submitting: boolean;
  onSubmit: () => void;
}

export interface CloudBackupPageProps {
  providerName: string;
  state: CloudBackupPageState;
  // Failure of the last backup or delete, shown above the content.
  notice?: { title: string; description: string };
  onBackUp: () => void;
  onRetry: () => void;
  onDelete: () => void;
  deleteDialogVisible: boolean;
  deleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  // Defaults to the text for this wallet's own backup.
  deleteDialogDescription?: string;
  walletPasswordSheet: Omit<PasswordSheetProps, 'title' | 'description' | 'confirmLabel'>;
  // Shown after the delete confirmation while a wallet exists.
  deletePasswordSheet?: Omit<PasswordSheetProps, 'title' | 'description' | 'confirmLabel'>;
  backups?: CloudBackupListItem[];
  onDeleteBackup?: (id: string) => void;
  // Asked before replacing a cloud copy that changed elsewhere.
  overwriteDialog?: { visible: boolean; description: string; onConfirm: () => void; onCancel: () => void };
  // Present while the user chooses the backup password.
  backupForm?: BackupPasswordFormProps;
  onBack: () => void;
}

// Second step of a backup, shown in place of the page content once the wallet password was accepted.
// These are backup passwords, not the wallet password, so biometrics never fill them.
const BackupPasswordForm = ({ providerName, form }: { providerName: string; form: BackupPasswordFormProps }): ReactElement => {
  const confirmRef = useRef<TextInputInstance>(null);

  const handleConfirmSubmit = (): void => {
    if (form.password && form.confirmPassword && !form.submitting) {
      form.onSubmit();
    }
  };

  return (
    <>
      <Text variant='section'>Create a backup password</Text>
      <Text variant='body' color='secondary'>
        {`This password encrypts your backup in ${providerName}. It is never saved, so you will need it to restore. Use a different password from your wallet password.`}
      </Text>
      <TextField
        label='Backup password'
        value={form.password}
        onChangeText={form.onChangePassword}
        placeholder='At least 12 characters'
        helper={form.password ? undefined : 'Use 12 or more characters. Several unrelated words work well.'}
        secure
        // Secure fields never autofill or save: a saved copy would sit next to the backup in the same account.
        autoFocus
        returnKeyType='next'
        submitBehavior='submit'
        onSubmitEditing={() => confirmRef.current?.focus()}
        disabled={form.submitting}
        error={form.passwordError}
        testID='backup-password-input'
      />
      {form.strength && !form.passwordError && <StrengthMeter strength={form.strength} />}
      <TextField
        ref={confirmRef}
        label='Confirm backup password'
        value={form.confirmPassword}
        onChangeText={form.onChangeConfirmPassword}
        placeholder='Enter the password again'
        secure
        returnKeyType='done'
        submitBehavior='submit'
        onSubmitEditing={handleConfirmSubmit}
        disabled={form.submitting}
        error={form.confirmError}
        testID='backup-password-confirm'
      />
      <PasswordNote />
    </>
  );
};

const STRENGTH_LEVELS = 3;

const StrengthMeter = ({ strength }: { strength: NonNullable<BackupPasswordFormProps['strength']> }): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View style={styles.strength}>
      {strength.level !== undefined && (
        <View style={styles.meter} testID='backup-password-meter'>
          {Array.from({ length: STRENGTH_LEVELS }, (_, index) => (
            <View
              key={index}
              style={[styles.meterSegment, index < strength.level! && { backgroundColor: colors.status[strength.color] }]}
            />
          ))}
        </View>
      )}
      <Text variant='meta' color={strength.color}>{`Password strength: ${strength.label}`}</Text>
    </View>
  );
};

const BackupList = ({ backups, onDelete }: { backups: CloudBackupListItem[]; onDelete?: (id: string) => void }): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.items}>
      <Text variant='row'>Backups in this account</Text>
      {backups.map(backup => (
        <View key={backup.id} style={styles.item} testID={`cloud-backup-item-${backup.id}`}>
          <View style={styles.itemLabel}>
            <Text variant='body'>{backup.label}</Text>
            <Text variant='meta' color='secondary'>{backup.current ? 'This wallet' : 'Another wallet or device'}</Text>
          </View>
          {onDelete && (
            <IconButton icon='trash' accessibilityLabel={`Delete ${backup.label}`} onPress={() => onDelete(backup.id)} testID={`cloud-backup-item-delete-${backup.id}`} />
          )}
        </View>
      ))}
    </View>
  );
};

const Header = ({ title, providerName }: { title: string; providerName: string }): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View style={styles.header}>
      <View style={styles.badge}>
        <Icon name='cloud' color={colors.icon.primary} />
      </View>
      <View style={styles.headerTexts}>
        <Text variant='section'>{title}</Text>
        <Text variant='meta' color='secondary'>{providerName}</Text>
      </View>
    </View>
  );
};

const PasswordNote = (): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View style={styles.note}>
      <Icon name='shield' color={colors.icon.primary} />
      <View style={styles.noteTexts}>
        <Text variant='row'>Keep your password safe</Text>
        <Text variant='meta' color='secondary'>You'll need your backup password when restoring this wallet.</Text>
      </View>
    </View>
  );
};

const BackedUpContent = ({ providerName, state }: { providerName: string; state: Extract<CloudBackupPageState, { kind: 'backedUp' }> }): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();

  const status = state.upload ? 'Uploading' : state.outdated ? 'Out of date' : 'Backed up';

  return (
    <>
      <Header
        title={state.upload
          ? `Uploading to ${providerName}…`
          : state.remoteChange ? state.remoteChange.title : state.outdated ? 'Your backup is out of date' : 'Your backup is ready'}
        providerName={providerName}
      />
      <Text variant='body' color='secondary'>
        {state.upload
          ? `Your backup is saved on this device and is not in ${providerName} yet. Keep Adena installed until the upload finishes.`
          : `Restore your wallet using your ${providerName} account and backup password.`}
      </Text>
      {state.upload?.error && <InlineAlert tone='error' title={state.upload.error.title} description={state.upload.error.description} />}
      {state.remoteChange && <InlineAlert tone='warning' title={state.remoteChange.title} description={state.remoteChange.description} />}
      {state.outdated && (
        <InlineAlert
          tone='warning'
          title='Accounts changed since your last backup'
          description='Back up again so a restore includes every account on this device.'
        />
      )}
      <View style={styles.items}>
        {state.items.map(item => (
          <View key={item} style={styles.item} accessible accessibilityLabel={`${item}, ${status}`}>
            <Text variant='row' style={styles.itemLabel}>{item}</Text>
            {state.upload || state.outdated
              ? <Text variant='meta' color='warning'>{status}</Text>
              : (
                  <>
                    <Text variant='meta' color='success'>Backed up</Text>
                    <Icon name='check' size={20} color={colors.icon.primary} />
                  </>
                )}
          </View>
        ))}
      </View>
      <Text variant='meta' color='secondary'>{`Last backup: ${state.backedUpAt}`}</Text>
      <PasswordNote />
    </>
  );
};

const NoneContent = ({ providerName }: { providerName: string }): ReactElement => (
  <>
    <Header title='Back up your wallet' providerName={providerName} />
    <Text variant='body' color='secondary'>
      {`Save an encrypted copy of your recovery phrases and private keys to your ${providerName}. Only your backup password can unlock it.`}
    </Text>
    <PasswordNote />
  </>
);

const Footer = ({ props }: { props: CloudBackupPageProps }): ReactElement | null => {
  const styles = useStyles();
  const { state, backupForm } = props;

  if (backupForm) {
    return (
      <Button
        label='Back up'
        loadingLabel='Backing up…'
        disabled={!backupForm.password || !backupForm.confirmPassword}
        loading={backupForm.submitting}
        onPress={backupForm.onSubmit}
        testID='backup-password-submit'
      />
    );
  }

  switch (state.kind) {
    case 'loading':
      return null;
    case 'error':
      return <Button label='Try again' onPress={props.onRetry} testID='cloud-backup-retry' />;
    case 'none':
      return <Button label='Back up now' onPress={props.onBackUp} testID='cloud-backup-create' />;
    case 'backedUp':
      return (
        <View style={styles.footer}>
          {state.upload && <Button label='Check again' tone='secondary' onPress={props.onRetry} testID='cloud-backup-check-upload' />}
          {(state.outdated || state.remoteChange) && <Button label='Back up again' onPress={props.onBackUp} testID='cloud-backup-update' />}
          <Button label='Delete backup' tone='destructiveOutline' onPress={props.onDelete} testID='cloud-backup-delete' />
        </View>
      );
  }
};

export const CloudBackupPage = (props: CloudBackupPageProps): ReactElement => {
  const styles = useStyles();
  const { state, providerName } = props;

  return (
    <Screen header={<TopBar title={`${providerName} backup`} onBack={props.onBack} />} footer={<Footer props={props} />}>
      {props.notice && <InlineAlert tone='error' title={props.notice.title} description={props.notice.description} />}
      {props.backupForm
        ? <BackupPasswordForm providerName={providerName} form={props.backupForm} />
        : (
            <>
              {state.kind === 'loading' && <View style={styles.loading}><Spinner /></View>}
              {state.kind === 'error' && <InlineAlert tone='error' title={state.title} description={state.description} />}
              {state.kind === 'none' && <NoneContent providerName={providerName} />}
              {state.kind === 'backedUp' && <BackedUpContent providerName={providerName} state={state} />}
              {props.backups && props.backups.length > 0 && <BackupList backups={props.backups} onDelete={props.onDeleteBackup} />}
            </>
          )}
      <PasswordSheet
        {...props.walletPasswordSheet}
        title='Enter your wallet password'
        description='Your wallet password unlocks the keys to back up.'
        confirmLabel='Continue'
      />
      <Dialog
        visible={props.deleteDialogVisible}
        title='Delete backup?'
        description={props.deleteDialogDescription
          ?? `The wallet stays on this device, but you won't be able to restore it from ${providerName} until you back up again.`}
        confirmLabel='Delete'
        destructive
        loading={props.deleting}
        onConfirm={props.onConfirmDelete}
        onCancel={props.onCancelDelete}
      />
      {props.deletePasswordSheet && (
        <PasswordSheet
          {...props.deletePasswordSheet}
          title='Enter your wallet password'
          description={`Your wallet password is required to delete a backup from ${providerName}.`}
          confirmLabel='Delete'
        />
      )}
      {props.overwriteDialog && (
        <Dialog
          visible={props.overwriteDialog.visible}
          title='Replace the backup?'
          description={props.overwriteDialog.description}
          confirmLabel='Replace'
          destructive
          onConfirm={props.overwriteDialog.onConfirm}
          onCancel={props.overwriteDialog.onCancel}
        />
      )}
    </Screen>
  );
};
