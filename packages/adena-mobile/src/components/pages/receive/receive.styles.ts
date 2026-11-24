import { StyleSheet } from 'react-native';

import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  body: { gap: spacing.space16 },
  qr: { alignItems: 'center', paddingVertical: spacing.space24 },
  qrCompact: { paddingVertical: spacing.space4 },
  identity: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space12 },
  accountName: { flexShrink: 1 },
  addressBox: {
    padding: spacing.space16,
    borderRadius: radius.input,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.subtle,
    gap: spacing.space4,
  },
  actions: { flexDirection: 'row', gap: spacing.space12 },
  action: { flex: 1 },
}));
