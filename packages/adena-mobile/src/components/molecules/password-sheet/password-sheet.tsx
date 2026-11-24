import React, { ReactElement, useEffect, useRef } from 'react';
import { Keyboard, TextInputInstance } from 'react-native';

import { Button, IconName } from '../../atoms';
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
  // Optional biometric alternative; the password field stays as the fallback.
  biometric?: { label: string; icon: IconName; onPress: () => void };
  // Each change focuses the field once the sheet is open. Without it the field focuses on open.
  focusRequest?: number;
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
  biometric,
  focusRequest,
}: PasswordSheetProps): ReactElement => {
  const inputRef = useRef<TextInputInstance>(null);
  const openedRef = useRef(false);
  const pendingFocusRef = useRef(false);
  const wasVisibleRef = useRef(false);
  const lastRequestRef = useRef(focusRequest);

  // Focus waits for the open animation and for a running check, so the keyboard never races the slide.
  const focusIfReady = (): void => {
    if (pendingFocusRef.current && openedRef.current && !submitting) {
      pendingFocusRef.current = false;
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    const requested = focusRequest !== lastRequestRef.current;
    const justOpened = visible && !wasVisibleRef.current;

    lastRequestRef.current = focusRequest;
    wasVisibleRef.current = visible;

    if (!visible) {
      openedRef.current = false;
      pendingFocusRef.current = false;
      return;
    }

    if (requested || (justOpened && focusRequest === undefined)) {
      pendingFocusRef.current = true;
    }

    focusIfReady();
  });

  const handleOpened = (): void => {
    openedRef.current = true;
    focusIfReady();
  };

  // Return and the button share one guard: no empty password, no second submission in flight.
  const handleConfirm = (): void => {
    if (!password || submitting) {
      return;
    }

    onConfirm();
  };

  const handleBiometric = (): void => {
    Keyboard.dismiss();
    biometric?.onPress();
  };

  return (
    <BottomSheet visible={visible} title={title} description={description} onClose={onClose} dismissible={!submitting} onOpened={handleOpened}>
      <TextField
        ref={inputRef}
        label='Password'
        value={password}
        onChangeText={onChangePassword}
        placeholder='Password'
        secure
        returnKeyType='done'
        submitBehavior='submit'
        onSubmitEditing={handleConfirm}
        disabled={submitting}
        error={error}
        testID='password-sheet-input'
      />
      <Button label={confirmLabel} disabled={!password} loading={submitting} loadingLabel='Verifying…' onPress={handleConfirm} />
      {biometric && (
        <Button label={`Use ${biometric.label}`} tone='secondary' leadingIcon={biometric.icon} disabled={submitting} onPress={handleBiometric} />
      )}
    </BottomSheet>
  );
};
