import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space8 },
  cell: {
    width: '31%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    paddingHorizontal: spacing.space12,
    paddingVertical: spacing.space8,
    borderRadius: radius.smallControl,
    backgroundColor: colors.background.subtle,
  },
  index: { minWidth: 18 },
});
