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
  // Each change focuses the field once the sheet presents. Without it the field focuses on open.
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
  // `presenting` once the sheet starts to slide in, `settled` once it has.
  const presentingRef = useRef(false);
  const settledRef = useRef(false);
  const retryOnSettleRef = useRef(false);
  const pendingFocusRef = useRef(false);
  const wasVisibleRef = useRef(false);
  const lastRequestRef = useRef(focusRequest);

  // Focus starts with the presentation so the keyboard rises with the sheet, and waits for a running check.
  const focusIfReady = (): void => {
    if (pendingFocusRef.current && presentingRef.current && !submitting) {
      pendingFocusRef.current = false;
      retryOnSettleRef.current = !settledRef.current;
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    const requested = focusRequest !== lastRequestRef.current;
    const justOpened = visible && !wasVisibleRef.current;

    lastRequestRef.current = focusRequest;
    wasVisibleRef.current = visible;

    if (!visible) {
      presentingRef.current = false;
      settledRef.current = false;
      retryOnSettleRef.current = false;
      pendingFocusRef.current = false;
      return;
    }

    if (requested || (justOpened && focusRequest === undefined)) {
      pendingFocusRef.current = true;
    }

    focusIfReady();
  });

  const handleWillOpen = (): void => {
    presentingRef.current = true;
    focusIfReady();
  };

  // iOS can refuse focus while the sheet is still entering the window; one retry once it has.
  const handleOpened = (): void => {
    presentingRef.current = true;
    settledRef.current = true;

    if (retryOnSettleRef.current && !inputRef.current?.isFocused()) {
      inputRef.current?.focus();
    }

    retryOnSettleRef.current = false;
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
    <BottomSheet visible={visible} title={title} description={description} onClose={onClose} dismissible={!submitting} onWillOpen={handleWillOpen} onOpened={handleOpened}>
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
