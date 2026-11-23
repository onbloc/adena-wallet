import { StyleSheet } from 'react-native';

import { colors, radius, sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  container: { gap: spacing.space8 },
  field: {
    minHeight: sizes.control,
    borderRadius: radius.input,
    paddingHorizontal: spacing.space12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
  },
  disabled: { backgroundColor: colors.action.disabled, borderColor: colors.action.disabled },
  value: { flex: 1 },
});
