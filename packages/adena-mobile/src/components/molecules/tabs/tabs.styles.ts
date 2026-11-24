import { StyleSheet } from 'react-native';

import { colors, fontFamily, sizes } from '../../../theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  tab: {
    height: sizes.tab,
    minWidth: 88,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  active: { borderBottomColor: colors.border.focus },
  activeLabel: { fontFamily: fontFamily.semiBold },
});
