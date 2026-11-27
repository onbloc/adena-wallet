import { StyleSheet } from 'react-native';

import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  card: {
    gap: spacing.space12,
    padding: spacing.space16,
    borderRadius: radius.surface,
    backgroundColor: colors.background.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.input,
  },
  rows: { gap: spacing.space8 },
  actions: { flexDirection: 'row', gap: spacing.space8 },
  action: { flex: 1 },
}));
