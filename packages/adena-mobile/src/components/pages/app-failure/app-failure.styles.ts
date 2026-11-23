import { StyleSheet } from 'react-native';

import { colors, sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.canvas, padding: sizes.screenInset },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.space8 },
  actions: { gap: spacing.space12 },
});
