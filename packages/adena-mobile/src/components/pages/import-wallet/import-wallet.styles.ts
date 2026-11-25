import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  masked: {
    alignItems: 'center',
    gap: spacing.space12,
    padding: spacing.space16,
    borderRadius: radius.smallControl,
    backgroundColor: colors.background.subtle,
  },
});
