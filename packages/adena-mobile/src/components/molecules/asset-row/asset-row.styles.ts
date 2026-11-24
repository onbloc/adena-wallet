import { StyleSheet } from 'react-native';

import { radius, sizes, spacing } from '../../../theme';

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
  name: { flex: 1, gap: 2 },
  values: { alignItems: 'flex-end', gap: 2, maxWidth: '55%' },
});
