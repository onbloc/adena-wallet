import { StyleSheet } from 'react-native';

import { radius, sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  base: {
    height: sizes.chip,
    borderRadius: radius.smallControl,
    paddingHorizontal: spacing.space12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space4,
    alignSelf: 'flex-start',
  },
});
