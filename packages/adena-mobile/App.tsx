import React, {useEffect, useState} from 'react';
import {SafeAreaView, StatusBar, StyleSheet, Text, View} from 'react-native';

import {makeDismissedResponse} from './src/platform/dismissed-response';
import {
  installMobilePlatform,
  PlatformInstallResult,
} from './src/platform/install';

type BootState =
  | {phase: 'booting'}
  | {phase: 'done'; result: PlatformInstallResult};

/**
 * M1-a shell: installs the platform layer and reports the result. Wallet
 * screens arrive in M1-b; until then this only proves that the native crypto,
 * storage and seams work on a device.
 */
function App(): React.JSX.Element {
  const [state, setState] = useState<BootState>({phase: 'booting'});

  useEffect(() => {
    installMobilePlatform(makeDismissedResponse).then(result =>
      setState({phase: 'done', result}),
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.body}>
        <Text style={styles.title}>Adena</Text>
        <Text testID="platform-status" style={styles.status}>
          {describe(state)}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function describe(state: BootState): string {
  if (state.phase === 'booting') {
    return 'Checking device security…';
  }
  const {result} = state;
  if (!result.ok) {
    const message =
      result.reason === 'crypto'
        ? 'Security self-test failed. Wallet features are disabled on this device.'
        : 'Secure storage could not be opened. Wallet features are disabled.';
    // Debug builds show the cause; release builds never print error details.
    return __DEV__ ? `${message}\n\n${result.error.message}` : message;
  }
  return result.platform.hardwareBackedStorage
    ? 'Platform ready.'
    : 'Platform ready. Warning: storage key is not hardware-backed on this device.';
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#ffffff'},
  body: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  title: {fontSize: 28, fontWeight: '600', color: '#111111', marginBottom: 12},
  status: {fontSize: 15, color: '#333333', textAlign: 'center'},
});

export default App;
