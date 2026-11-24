import { StyleSheet } from 'react-native';

import { colors, radius, sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  row: {
    minHeight: sizes.assetRow,
    borderRadius: radius.input,
    paddingHorizontal: spacing.space12,
    paddingVertical: spacing.space8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
  },
  idle: { backgroundColor: colors.background.subtle },
  texts: { flex: 1, gap: 2 },
});
