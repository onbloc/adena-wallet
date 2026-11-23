import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  card: { borderRadius: radius.input, backgroundColor: colors.background.subtle, padding: spacing.space16, gap: spacing.space8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12 },
  texts: { flex: 1, gap: 2 },
});
