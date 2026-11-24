import { StyleSheet } from 'react-native';

import { colors, fontFamily, radius, spacing, typography } from '../../../theme';

export const styles = StyleSheet.create({
  grid: { gap: spacing.space4 },
  row: { flexDirection: 'row' },
  key: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radius.input },
  pressed: { backgroundColor: colors.background.pressed },
  digit: { ...typography.title, fontFamily: fontFamily.regular },
});
