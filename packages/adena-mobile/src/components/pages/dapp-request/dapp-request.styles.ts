import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  origin: { gap: spacing.space4 },
  message: { borderRadius: radius.input, backgroundColor: colors.background.subtle, padding: spacing.space16, gap: spacing.space4 },
  actions: { flexDirection: 'row', gap: spacing.space8 },
  action: { flex: 1 },
});
