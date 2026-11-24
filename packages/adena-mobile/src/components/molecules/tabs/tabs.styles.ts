import { StyleSheet } from 'react-native';

import { colors, fontFamily, sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.space24 },
  tab: {
    height: sizes.tab,
    paddingHorizontal: spacing.space8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  active: { borderBottomColor: colors.border.focus },
  label: { fontFamily: fontFamily.medium },
  activeLabel: { fontFamily: fontFamily.semiBold },
});
