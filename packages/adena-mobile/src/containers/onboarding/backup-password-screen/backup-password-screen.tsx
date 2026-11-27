import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { BackupPasswordPage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { OnboardingStackParamList } from '../../../navigation/types';
import { cloudProviderName } from '../../../presenters/cloud-backup.presenter';
import { BACKUP_PASSWORD_ISSUE_MESSAGE, BackupPasswordStrength, evaluateBackupPassword, findBackupPasswordIssue, PasswordIssue } from '../../../security/password-policy';
import { useOnboardingStore } from '../../../stores/onboarding.store';

const STRENGTH_LABEL: Record<BackupPasswordStrength, string> = {
  weak: 'Too weak',
  good: 'Good password',
  strong: 'Strong password',
};

// The password is kept in memory until the wallet exists; the backup is written right after it is created.
export const BackupPasswordScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'BackupPassword'>): ReactElement => {
  const { cloudBackupService } = useContainer();
  const setBackupPassword = useOnboardingStore(state => state.setBackupPassword);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const strength = password ? evaluateBackupPassword(password).strength : undefined;

  const handleSubmit = (): void => {
    const issue = findBackupPasswordIssue(password, { confirm: confirmPassword });

    if (issue === PasswordIssue.NOT_MATCH) {
      setConfirmError(BACKUP_PASSWORD_ISSUE_MESSAGE[issue]);
      return;
    }

    if (issue) {
      setPasswordError(BACKUP_PASSWORD_ISSUE_MESSAGE[issue]);
      return;
    }

    setBackupPassword(password);
    navigation.navigate('ProtectWallet');
  };

  return (
    <BackupPasswordPage
      providerName={cloudProviderName(cloudBackupService.provider)}
      password={password}
      confirmPassword={confirmPassword}
      onChangePassword={(value) => {
        setPassword(value);
        setPasswordError(undefined);
      }}
      onChangeConfirmPassword={(value) => {
        setConfirmPassword(value);
        setConfirmError(undefined);
      }}
      strength={strength && { label: STRENGTH_LABEL[strength], color: strength === 'weak' ? 'error' : 'success' }}
      passwordError={passwordError}
      confirmError={confirmError}
      onSubmit={handleSubmit}
      onBack={navigation.goBack}
    />
  );
};
