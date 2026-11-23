import { StyleSheet } from 'react-native';

import { sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  bar: {
    height: sizes.topBar,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.space8,
    gap: spacing.space4,
  },
  title: { flexShrink: 1, paddingHorizontal: spacing.space8 },
  trailing: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: spacing.space8, paddingRight: spacing.space4 },
});
