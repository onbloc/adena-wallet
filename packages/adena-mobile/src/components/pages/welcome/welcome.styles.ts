import { StyleSheet } from 'react-native';

import { fontFamily, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  brand: { marginBottom: spacing.space8 },
  wordmark: { fontFamily: fontFamily.bold, fontSize: 30, lineHeight: 36, letterSpacing: 0.2 },
});
