import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useRef, useState } from 'react';

import { RestoreBackupPage, RestoreBackupPageState, RestoreDeleteStep } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { AppErrorCode, isAppError } from '../../../core/errors';
import { useContainer } from '../../../di/container-provider';
import { OnboardingStackParamList } from '../../../navigation/types';
import { cloudProviderName, describeBackupError, formatBackupTime } from '../../../presenters/cloud-backup.presenter';
import { useRestorableBackupsQuery } from '../../../queries/cloud-backup.queries';
import { CloudBackupProvider } from '../../../repositories/cloud-backup/cloud-backup-store';
import { useOnboardingStore } from '../../../stores/onboarding.store';

const CLOUD_ERRORS: AppErrorCode[] = [
  AppErrorCode.CLOUD_BACKUP_UNAVAILABLE,
  AppErrorCode.CLOUD_BACKUP_NOT_SIGNED_IN,
  AppErrorCode.CLOUD_BACKUP_QUOTA,
  AppErrorCode.NETWORK_ERROR,
  AppErrorCode.USER_REJECTED,
];

export const RestoreBackupScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'RestoreBackup'>): ReactElement => {
  const { cloudBackupService } = useContainer();
  const setRestoreBackup = useOnboardingStore(state => state.setRestoreBackup);
  const provider = cloudBackupService.provider;
  // The user asked to restore, so Google Drive may ask for access here.
  const backupsQuery = useRestorableBackupsQuery({ interactive: true });

  const [selectedId, setSelectedId] = useState<string>();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<RestoreDeleteStep>();
  const [deleting, setDeleting] = useState(false);
  const submittingRef = useRef(false);
  // Bumped when the user leaves, so an open that settles afterwards cannot take over another onboarding flow.
  const operationRef = useRef(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      operationRef.current += 1;
      submittingRef.current = false;
      setSubmitting(false);
    });

    return (): void => {
      unsubscribe();
      operationRef.current += 1;
    };
  }, [navigation]);

  const backups = backupsQuery.data ?? [];
  const selected = backups.find(backup => backup.fileName === selectedId)?.fileName ?? backups[0]?.fileName;
  const pendingDelete = backups.find(backup => backup.fileName === deleteTarget);

  const state: RestoreBackupPageState = backupsQuery.data
    ? backups.length === 0
      ? { kind: 'empty' }
      : {
          kind: 'ready',
          backups: backups.map(backup => ({ id: backup.fileName, label: `Backup from ${formatBackupTime(backup.modifiedAt)}` })),
          selectedId: selected!,
        }
    : backupsQuery.error && !backupsQuery.isFetching
      ? { kind: 'error', ...describeBackupError(backupsQuery.error, provider) }
      : { kind: 'loading' };

  const handleSubmit = async (): Promise<void> => {
    if (!selected || !password || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    const operation = ++operationRef.current;

    try {
      const content = await cloudBackupService.openBackup(selected, password);

      // Dropped unused when the user left meanwhile.
      if (operation !== operationRef.current) {
        return;
      }

      setRestoreBackup(content);
      setPassword('');
      navigation.navigate('CreatePassword');
    }
    catch (openError) {
      if (operation !== operationRef.current) {
        return;
      }

      if (isAppError(openError, AppErrorCode.INVALID_PASSWORD)) {
        setError('Incorrect backup password.');
      }
      else if (CLOUD_ERRORS.some(code => isAppError(openError, code))) {
        setError(describeBackupError(openError, provider).description);
      }
      else {
        setError(toErrorMessage(openError));
      }
    }
    finally {
      if (operation === operationRef.current) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  const closeDelete = (): void => {
    setDeleteStep(undefined);
    setDeleteTarget(null);
  };

  // No wallet exists yet, so instead of a password the user confirms twice.
  const handleConfirmDelete = async (): Promise<void> => {
    if (deleteStep === 'confirm') {
      setDeleteStep('confirmAgain');
      return;
    }

    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);

    try {
      await cloudBackupService.deleteBackup(deleteTarget);
      setError(undefined);
      await backupsQuery.refetch();
    }
    catch (deleteError) {
      setError(CLOUD_ERRORS.some(code => isAppError(deleteError, code)) ? describeBackupError(deleteError, provider).description : toErrorMessage(deleteError));
    }
    finally {
      setDeleting(false);
      closeDelete();
    }
  };

  const handleDeleteBackup = (id: string): void => {
    setDeleteTarget(id);
    setDeleteStep('confirm');
  };

  const handleChangePassword = (value: string): void => {
    setPassword(value);
    setError(undefined);
  };

  const handleSelect = (id: string): void => {
    setSelectedId(id);
    setError(undefined);
  };

  return (
    <RestoreBackupPage
      providerName={cloudProviderName(provider)}
      state={state}
      onSelect={handleSelect}
      password={password}
      onChangePassword={handleChangePassword}
      error={error}
      submitting={submitting}
      onSubmit={handleSubmit}
      onRetry={() => backupsQuery.refetch()}
      onBack={navigation.goBack}
      emptyHint={provider === CloudBackupProvider.ICLOUD ? 'On a new device, iCloud can take a few minutes to sync. Check again later.' : undefined}
      onDeleteBackup={handleDeleteBackup}
      deleteStep={deleteStep}
      deleteLabel={pendingDelete && `Backup from ${formatBackupTime(pendingDelete.modifiedAt)}`}
      deleting={deleting}
      onConfirmDelete={handleConfirmDelete}
      onCancelDelete={() => !deleting && closeDelete()}
    />
  );
};
