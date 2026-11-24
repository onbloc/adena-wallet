import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { isCoveredBySheet } from '../../../components/molecules';
import { CloudBackupPage, CloudBackupPageState, StrengthColor } from '../../../components/pages';
import { AppErrorCode, isAppError } from '../../../core/errors';
import { useContainer } from '../../../di/container-provider';
import { usePasswordGate } from '../../../hooks/use-password-gate';
import { MainStackParamList } from '../../../navigation/types';
import {
  backedUpItemLabels,
  BackupNoticeView,
  cloudProviderName,
  describeBackupError,
  describeRemoteChange,
  formatBackupTime,
} from '../../../presenters/cloud-backup.presenter';
import { useCloudBackupStatusQuery, useRestorableBackupsQuery } from '../../../queries/cloud-backup.queries';
import { queryKeys } from '../../../queries/query-keys';
import { BACKUP_PASSWORD_ISSUE_MESSAGE, BackupPasswordStrength, evaluateBackupPassword, PasswordIssue } from '../../../security/password-policy';
import { CloudBackupStatus } from '../../../services/cloud-backup.service';
import { useToastStore } from '../../../stores/toast.store';

interface BackupForm {
  password: string;
  confirmPassword: string;
  passwordError?: string;
  confirmError?: string;
}

const EMPTY_FORM: BackupForm = { password: '', confirmPassword: '' };

const STRENGTH_VIEW: Record<BackupPasswordStrength, { label: string; color: StrengthColor; level: number }> = {
  weak: { label: 'Too weak', color: 'error', level: 1 },
  good: { label: 'Good', color: 'success', level: 2 },
  strong: { label: 'Strong', color: 'success', level: 3 },
};

export const CloudBackupScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'CloudBackup'>): ReactElement => {
  const { cloudBackupService } = useContainer();
  const queryClient = useQueryClient();
  const showToast = useToastStore(state => state.show);
  const statusQuery = useCloudBackupStatusQuery();
  // Listed once the status check got through, so Google Drive never asks for access on its own.
  const backupsQuery = useRestorableBackupsQuery({ interactive: false, enabled: statusQuery.isSuccess });
  const provider = cloudBackupService.provider;
  const providerName = cloudProviderName(provider);

  const [notice, setNotice] = useState<BackupNoticeView>();
  const [form, setForm] = useState<BackupForm | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [overwriteDescription, setOverwriteDescription] = useState<string | null>(null);
  // Held only between the two steps of one backup; cleared on success, cancel, blur and background.
  const walletPasswordRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    const discard = (): void => {
      walletPasswordRef.current = null;
      setForm(null);
      setOverwriteDescription(null);
    };
    // Its password sheets are routes over this screen, not a departure from it.
    const unsubscribeBlur = navigation.addListener('blur', () => {
      if (!isCoveredBySheet(navigation)) {
        discard();
      }
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        discard();
      }
    });

    return (): void => {
      unsubscribeBlur();
      appState.remove();
      walletPasswordRef.current = null;
    };
  }, [navigation]);

  const walletPasswordGate = usePasswordGate(async (password) => {
    await cloudBackupService.verifyWalletPassword(password);
    walletPasswordRef.current = password;
    setNotice(undefined);
    setForm(EMPTY_FORM);
  }, { prompt: { title: 'Back up wallet', cancel: 'Use password' } });

  const refreshBackups = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.restorableBackups(false) });
  };

  const setStatus = (status: CloudBackupStatus): void => {
    queryClient.setQueryData(queryKeys.cloudBackupStatus(), status);
    refreshBackups();
  };

  // Errors other than a wrong password close the sheet and show above the content.
  const deletePasswordGate = usePasswordGate(async (password) => {
    const target = deleteTarget;

    if (!target) {
      return;
    }

    try {
      await cloudBackupService.deleteBackup(target, { walletPassword: password });
    }
    catch (error) {
      if (isAppError(error, AppErrorCode.INVALID_PASSWORD) || isAppError(error, AppErrorCode.PASSWORD_ATTEMPTS_EXCEEDED)) {
        throw error;
      }

      setNotice(describeBackupError(error, provider));
      setDeleteTarget(null);
      return;
    }

    setDeleteTarget(null);
    setStatus(cloudBackupService.getLocalStatus());
    showToast(`Backup deleted from ${providerName}`);
  }, { prompt: { title: 'Delete backup', cancel: 'Use password' } });

  const discardForm = (): void => {
    walletPasswordRef.current = null;
    setForm(null);
    setOverwriteDescription(null);
  };

  const updateForm = (patch: Partial<BackupForm>): void => setForm(current => (current ? { ...current, ...patch } : current));

  const submitBackup = async (overwrite: boolean): Promise<void> => {
    const walletPassword = walletPasswordRef.current;

    if (!form || submittingRef.current) {
      return;
    }

    if (!walletPassword) {
      discardForm();
      return;
    }

    const issue = cloudBackupService.findBackupPasswordIssue(form.password, form.confirmPassword, walletPassword);

    if (issue) {
      updateForm(issue === BACKUP_PASSWORD_ISSUE_MESSAGE[PasswordIssue.NOT_MATCH] ? { confirmError: issue } : { passwordError: issue });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      setStatus(await cloudBackupService.createBackup({ walletPassword, backupPassword: form.password, confirmPassword: form.confirmPassword, overwrite }));
      discardForm();
      showToast(`Backed up to ${providerName}`, 'success');
    }
    catch (error) {
      if (isAppError(error, AppErrorCode.WEAK_PASSWORD)) {
        updateForm({ passwordError: error.message });
      }
      else if (isAppError(error, AppErrorCode.BACKUP_CONFLICT)) {
        // Keeps the form and both passwords until the user decides.
        setOverwriteDescription(error.message);
      }
      else {
        discardForm();
        setNotice(isAppError(error, AppErrorCode.INVALID_PASSWORD)
          ? { title: 'Incorrect wallet password', description: 'Start the backup again.' }
          : describeBackupError(error, provider));
      }
    }
    finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleConfirmOverwrite = (): void => {
    setOverwriteDescription(null);
    void submitBackup(true);
  };

  const requestDelete = (fileName: string): void => {
    setNotice(undefined);
    setDeleteTarget(fileName);
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = (): void => {
    setDeleteDialogVisible(false);
    deletePasswordGate.open();
  };

  const handleCancelDelete = (): void => {
    setDeleteDialogVisible(false);
    setDeleteTarget(null);
  };

  // Google Drive asks for access here, never on its own.
  const handleRetry = async (): Promise<void> => {
    setNotice(undefined);

    if (isAppError(statusQuery.error, AppErrorCode.CLOUD_BACKUP_NOT_SIGNED_IN)) {
      try {
        setStatus(await cloudBackupService.getStatus({ interactive: true }));
        return;
      }
      catch {
        // Falls through to a plain refetch, which shows the current error.
      }
    }

    await statusQuery.refetch();
  };

  const handleBackUp = (): void => {
    setNotice(undefined);
    walletPasswordGate.open();
  };

  const handleBack = (): void => {
    if (form) {
      if (!submittingRef.current) {
        discardForm();
      }

      return;
    }

    navigation.goBack();
  };

  const strength = form?.password ? STRENGTH_VIEW[evaluateBackupPassword(form.password).strength] : undefined;
  const status = statusQuery.data;
  const ownFileName = status?.kind === 'backedUp' ? status.fileName : undefined;

  const state: CloudBackupPageState = status
    ? status.kind === 'none'
      ? { kind: 'none' }
      : {
          kind: 'backedUp',
          backedUpAt: formatBackupTime(status.backedUpAt),
          outdated: status.outdated,
          items: backedUpItemLabels(status),
          ...(status.remoteChange && { remoteChange: describeRemoteChange(status.remoteChange, provider) }),
        }
    : statusQuery.error && !statusQuery.isFetching
      ? { kind: 'error', ...describeBackupError(statusQuery.error, provider) }
      : { kind: 'loading' };

  const deleteDialogDescription = deleteTarget && deleteTarget !== ownFileName
    ? `This backup belongs to another wallet or device. Once deleted, it can't be restored from ${providerName}.`
    : undefined;

  return (
    <CloudBackupPage
      providerName={providerName}
      state={state}
      notice={notice}
      onBackUp={handleBackUp}
      onRetry={handleRetry}
      onDelete={() => ownFileName && requestDelete(ownFileName)}
      deleteDialogVisible={deleteDialogVisible}
      deleteDialogDescription={deleteDialogDescription}
      deleting={deletePasswordGate.sheetProps.submitting}
      onConfirmDelete={handleConfirmDelete}
      onCancelDelete={handleCancelDelete}
      walletPasswordSheet={walletPasswordGate.sheetProps}
      deletePasswordSheet={deletePasswordGate.sheetProps}
      backups={backupsQuery.data?.map(backup => ({
        id: backup.fileName,
        label: `Backup from ${formatBackupTime(backup.modifiedAt)}`,
        current: backup.current,
      }))}
      onDeleteBackup={requestDelete}
      overwriteDialog={{
        visible: overwriteDescription !== null,
        description: overwriteDescription ?? '',
        onConfirm: handleConfirmOverwrite,
        onCancel: () => setOverwriteDescription(null),
      }}
      backupForm={form
        ? {
            password: form.password,
            confirmPassword: form.confirmPassword,
            onChangePassword: value => updateForm({ password: value, passwordError: undefined }),
            onChangeConfirmPassword: value => updateForm({ confirmPassword: value, confirmError: undefined }),
            strength,
            passwordError: form.passwordError,
            confirmError: form.confirmError,
            submitting,
            onSubmit: () => submitBackup(false),
          }
        : undefined}
      onBack={handleBack}
    />
  );
};
