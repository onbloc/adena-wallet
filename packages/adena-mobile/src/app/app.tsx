import React, { ReactElement } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '../components/atoms';
import { colors, sizes, spacing } from '../theme';

// Placeholder shell until the wallet flows are wired in; the design system is reviewed in Storybook.
const App = (): ReactElement => (
  <SafeAreaProvider>
    <StatusBar barStyle='dark-content' />
    <View style={styles.root}>
      <Text variant='display'>Adena</Text>
      <Text variant='body' color='secondary' align='center'>Mobile wallet</Text>
    </View>
  </SafeAreaProvider>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space8,
    padding: sizes.screenInset,
    backgroundColor: colors.background.canvas,
  },
});

export default App;
