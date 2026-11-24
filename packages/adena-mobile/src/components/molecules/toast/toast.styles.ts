import { StyleSheet } from 'react-native';

import { colors, elevation, radius, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    minHeight: 52,
    paddingLeft: spacing.space16,
    paddingRight: spacing.space4,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.surface,
    ...elevation.overlay,
  },
  message: { flex: 1 },
});
