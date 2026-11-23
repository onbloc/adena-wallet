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
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    backgroundColor: colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  amount: { maxWidth: '45%' },
});
