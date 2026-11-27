import { StyleSheet } from 'react-native';

import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  bodyFrame: { gap: spacing.space12 },
  body: { flexGrow: 0 },
  content: { gap: spacing.space16, paddingBottom: spacing.space8 },
  models: { gap: spacing.space4 },
  status: {
    gap: spacing.space8,
    padding: spacing.space16,
    borderRadius: radius.input,
    backgroundColor: colors.background.subtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },
  track: { height: 6, borderRadius: radius.circle, overflow: 'hidden', backgroundColor: colors.border.subtle },
  fill: { height: 6, borderRadius: radius.circle, backgroundColor: colors.action.primary },
  buttons: { gap: spacing.space8 },
}));
