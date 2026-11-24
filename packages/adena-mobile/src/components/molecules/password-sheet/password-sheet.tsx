import React, { ReactElement } from 'react';

import { Button } from '../../atoms';
import { BottomSheet } from '../bottom-sheet';
import { TextField } from '../text-field';

export interface PasswordSheetProps {
  visible: boolean;
  title: string;
  description?: string;
  password: string;
  onChangePassword: (value: string) => void;
  error?: string;
  submitting: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

// Shared password gate used by sensitive actions on several pages.
export const PasswordSheet = ({
  visible,
  title,
  description,
  password,
  onChangePassword,
  error,
  submitting,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
}: PasswordSheetProps): ReactElement => {
  // Return and the button share one guard: no empty password, no second submission in flight.
  const handleConfirm = (): void => {
    if (!password || submitting) {
      return;
    }

    onConfirm();
  };

  return (
    <BottomSheet visible={visible} title={title} description={description} onClose={onClose} dismissible={!submitting}>
      <TextField
        label='Password'
        value={password}
        onChangeText={onChangePassword}
        placeholder='Password'
        secure
        autoCapitalize='none'
        autoFocus
        onSubmitEditing={handleConfirm}
        disabled={submitting}
        error={error}
        testID='password-sheet-input'
      />
      <Button label={confirmLabel} disabled={!password} loading={submitting} loadingLabel='Verifying…' onPress={handleConfirm} />
    </BottomSheet>
  );
};
