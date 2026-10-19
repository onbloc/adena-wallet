import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {Modal, StyleSheet, View} from 'react-native';

import {useWallet} from '../core/wallet-context';
import {unlockWithBiometrics} from '../platform/biometric-unlock';
import {Body, Button, ErrorText, Field, Gap, Title} from '../ui/components';
import {colors, radius, spacing} from '../ui/theme';

/** Resolves false when the user cancels or `signal` aborts first. */
type Reauth = (reason: string, signal?: AbortSignal) => Promise<boolean>;

interface PromptHost {
  prompt: React.ReactElement;
  register(): () => void;
}

const ReauthContext = createContext<Reauth | null>(null);
const PromptHostContext = createContext<PromptHost | null>(null);

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

/**
 * Renders the password prompt inside another full-screen modal. iOS presents
 * one modal per view controller, so a prompt opened from the dApp approval
 * sheet must be a child of that sheet; one at the app root never shows.
 */
export function ReauthHost() {
  const host = useContext(PromptHostContext);
  const [registered, setRegistered] = useState(false);
  const register = host?.register;

  useEffect(() => {
    if (!register) {
      return;
    }
    const unregister = register();
    setRegistered(true);
    return unregister;
  }, [register]);

  return registered && host ? host.prompt : null;
}

export function ReauthProvider({children}: React.PropsWithChildren) {
  const {verifyPassword, biometricEnabled} = useWallet();
  const [prompt, setPrompt] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [nestedHosts, setNestedHosts] = useState(0);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const finish = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setPrompt(null);
    setPassword('');
    setError('');
  }, []);

  const requestReauth = useCallback<Reauth>(
    async (reason, signal) => {
      if (signal?.aborted) {
        return false;
      }
      if (biometricEnabled && (await unlockWithBiometrics(reason))) {
        return !signal?.aborted;
      }
      if (signal?.aborted) {
        return false;
      }
      return new Promise<boolean>(resolve => {
        resolver.current?.(false);
        resolver.current = resolve;
        setPrompt(reason);
        signal?.addEventListener('abort', () => {
          if (resolver.current === resolve) {
            finish(false);
          }
        });
      });
    },
    [biometricEnabled, finish],
  );

  const submit = useCallback(async () => {
    const pending = resolver.current;
    setChecking(true);
    const ok = await verifyPassword(password);
    setChecking(false);
    // The request may have been withdrawn while the password was checked.
    if (resolver.current !== pending) {
      return;
    }
    if (ok) {
      finish(true);
    } else {
      setError('The password is incorrect.');
    }
  }, [password, verifyPassword, finish]);

  const register = useCallback(() => {
    setNestedHosts(count => count + 1);
    return () => setNestedHosts(count => count - 1);
  }, []);

  const view = (
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
  );

  const host: PromptHost = {prompt: view, register};

  return (
    <ReauthContext.Provider value={requestReauth}>
      <PromptHostContext.Provider value={host}>
        {children}
      </PromptHostContext.Provider>
      {nestedHosts === 0 && view}
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
