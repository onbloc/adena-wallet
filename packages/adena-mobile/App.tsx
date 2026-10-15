import React, {useCallback, useEffect, useRef, useState} from 'react';
import {SafeAreaView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import {WalletProvider} from './src/core/wallet-context';
import {RootNavigator} from './src/navigation/RootNavigator';
import {makeDismissedResponse} from './src/platform/dismissed-response';
import {
  installMobilePlatform,
  MobilePlatform,
  PlatformInstallResult,
} from './src/platform/install';
import {ReauthProvider} from './src/security/reauth';
import {colors, fonts} from './src/ui/theme';

type BootState =
  | {phase: 'booting'}
  | {phase: 'done'; result: PlatformInstallResult};

const ACTIVITY_PING_MS = 5_000;

function App(): React.JSX.Element {
  const [state, setState] = useState<BootState>({phase: 'booting'});

  useEffect(() => {
    installMobilePlatform(makeDismissedResponse).then(result =>
      setState({phase: 'done', result}),
    );
  }, []);

  if (state.phase === 'done' && state.result.ok) {
    return <WalletApp platform={state.result.platform} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.body}>
        <Text style={styles.title}>Adena</Text>
        <Text testID="platform-status" style={styles.status}>
          {describe(state)}
        </Text>
      </View>
    </SafeAreaView>
  );
}

/** The wallet UI, shown only after the platform layer installed successfully. */
function WalletApp({platform}: {platform: MobilePlatform}) {
  const lastPing = useRef(0);

  // Any touch counts as activity for the foreground auto-lock timer.
  const onActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastPing.current > ACTIVITY_PING_MS) {
      lastPing.current = now;
      platform.autoLock.reset();
    }
  }, [platform]);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <View style={styles.container} onTouchStart={onActivity}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />
        <WalletProvider platform={platform}>
          <ReauthProvider>
            <RootNavigator />
          </ReauthProvider>
        </WalletProvider>
      </View>
    </SafeAreaProvider>
  );
}

function describe(state: BootState): string {
  if (state.phase === 'booting') {
    return 'Checking device security…';
  }
  const {result} = state;
  if (result.ok) {
    return 'Platform ready.';
  }
  const message =
    result.reason === 'crypto'
      ? 'Security self-test failed. Wallet features are disabled on this device.'
      : 'Secure storage could not be opened. Wallet features are disabled.';
  // Debug builds show the cause; release builds never print error details.
  return __DEV__ ? `${message}\n\n${result.error.message}` : message;
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  body: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  title: {...fonts.header3, color: colors.text, marginBottom: 12},
  status: {...fonts.body2Reg, color: colors.textMuted, textAlign: 'center'},
});

export default App;
