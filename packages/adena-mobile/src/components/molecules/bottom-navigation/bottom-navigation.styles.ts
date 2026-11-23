import { StyleSheet } from 'react-native';

import { sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  bar: {
    height: sizes.bottomNavigation,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sizes.screenInset,
  },
  destinations: { flexDirection: 'row', gap: spacing.space4 },
});
