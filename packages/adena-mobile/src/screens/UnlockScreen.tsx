import React, {useCallback, useEffect, useState} from 'react';

import {unlockThrottle} from '../core/unlock-throttle';
import {useWallet} from '../core/wallet-context';
import {Body, Button, ErrorText, Field, Screen, Title} from '../ui/components';

export function UnlockScreen() {
  const {unlock, unlockWithBiometrics, biometricEnabled} = useWallet();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [waitMs, setWaitMs] = useState(0);

  useEffect(() => {
    unlockThrottle.remainingMs().then(setWaitMs);
  }, []);

  useEffect(() => {
    if (waitMs <= 0) {
      return;
    }
    const timer = setTimeout(
      () => setWaitMs(ms => Math.max(0, ms - 1000)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [waitMs]);

  const tryBiometrics = useCallback(async () => {
    if (await unlockWithBiometrics()) {
      await unlockThrottle.reset();
    }
  }, [unlockWithBiometrics]);

  useEffect(() => {
    if (biometricEnabled) {
      tryBiometrics();
    }
  }, [biometricEnabled, tryBiometrics]);

  const submit = async () => {
    if ((await unlockThrottle.remainingMs()) > 0) {
      return;
    }
    setBusy(true);
    const ok = await unlock(password);
    setBusy(false);
    if (ok) {
      setPassword('');
      await unlockThrottle.reset();
      return;
    }
    const wait = await unlockThrottle.recordFailure();
    setWaitMs(wait);
    setError('The password is incorrect.');
  };

  return (
    <Screen topInset>
      <Title>Unlock Adena</Title>
      <Field
        label="Password"
        secret
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
        editable={waitMs === 0}
      />
      <ErrorText>{error}</ErrorText>
      {waitMs > 0 && (
        <Body muted>
          Too many attempts. Try again in {Math.ceil(waitMs / 1000)}s.
        </Body>
      )}
      <Button
        title="Unlock"
        onPress={submit}
        loading={busy}
        disabled={!password || waitMs > 0}
      />
      {biometricEnabled && (
        <Button
          title="Use biometrics"
          variant="secondary"
          onPress={tryBiometrics}
        />
      )}
    </Screen>
  );
}
