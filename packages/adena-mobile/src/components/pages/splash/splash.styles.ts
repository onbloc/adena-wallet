import { StyleSheet } from 'react-native';

// Matches the native launch screen: centered 128pt logo on the canvas color.
export const LAUNCH_LOGO_SIZE = 128;

export const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: LAUNCH_LOGO_SIZE, height: LAUNCH_LOGO_SIZE },
});
