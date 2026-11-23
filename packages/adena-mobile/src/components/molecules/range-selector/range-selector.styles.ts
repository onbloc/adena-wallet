import { StyleSheet } from 'react-native';

import { colors, radius, sizes } from '../../../theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  pill: {
    minWidth: 52,
    height: sizes.chip,
    paddingHorizontal: 12,
    borderRadius: radius.smallControl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.subtle,
  },
  active: { backgroundColor: colors.action.primary },
  pressed: { backgroundColor: colors.action.secondaryPressed },
});
