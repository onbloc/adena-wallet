import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  card: {
    borderRadius: radius.surface,
    padding: spacing.space16,
    backgroundColor: colors.background.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
    gap: spacing.space4,
  },
  slot: { marginTop: spacing.space12, gap: spacing.space8 },
});
