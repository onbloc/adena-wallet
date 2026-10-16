import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {Modal, StyleSheet, View} from 'react-native';

import {useWallet} from '../core/wallet-context';
import {unlockWithBiometrics} from '../platform/biometric-unlock';
import {Body, Button, ErrorText, Field, Gap, Title} from '../ui/components';
import {colors, radius, spacing} from '../ui/theme';

type Reauth = (reason: string) => Promise<boolean>;

const ReauthContext = createContext<Reauth | null>(null);

/**
 * `requestReauth(reason)` resolves true only after the user proves presence
 * again: biometrics when enabled (falling back to the password if cancelled),
 * otherwise the wallet password. Used before every signature and before
 * showing the recovery phrase.
 */
export function useReauth(): Reauth {
  const value = useContext(ReauthContext);
  if (!value) {
    throw new Error('useReauth must be used inside ReauthProvider');
  }
  return value;
}

export function ReauthProvider({children}: React.PropsWithChildren) {
  const {verifyPassword, biometricEnabled} = useWallet();
  const [prompt, setPrompt] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const finish = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setPrompt(null);
    setPassword('');
    setError('');
  }, []);

  const requestReauth = useCallback<Reauth>(
    async reason => {
      if (biometricEnabled && (await unlockWithBiometrics(reason))) {
        return true;
      }
      return new Promise<boolean>(resolve => {
        resolver.current?.(false);
        resolver.current = resolve;
        setPrompt(reason);
      });
    },
    [biometricEnabled],
  );

  const submit = useCallback(async () => {
    setChecking(true);
    const ok = await verifyPassword(password);
    setChecking(false);
    if (ok) {
      finish(true);
    } else {
      setError('The password is incorrect.');
    }
  }, [password, verifyPassword, finish]);

  return (
    <ReauthContext.Provider value={requestReauth}>
      {children}
      <Modal
        visible={prompt !== null}
        transparent
        animationType="fade"
        onRequestClose={() => finish(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Title>Confirm it's you</Title>
            <Body muted>{prompt}</Body>
            <Field
              label="Wallet password"
              secret
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
              autoFocus
            />
            <ErrorText>{error}</ErrorText>
            <Button
              title="Confirm"
              onPress={submit}
              loading={checking}
              disabled={!password}
            />
            <Gap size={spacing.xs} />
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => finish(false)}
            />
          </View>
        </View>
      </Modal>
    </ReauthContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
