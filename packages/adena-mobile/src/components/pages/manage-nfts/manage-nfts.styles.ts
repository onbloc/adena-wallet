import { StyleSheet } from 'react-native';

import { colors, radius, sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  row: {
    minHeight: sizes.assetRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    paddingHorizontal: spacing.space12,
    borderRadius: radius.input,
    backgroundColor: colors.background.subtle,
  },
  texts: { flex: 1, gap: 2 },
});
