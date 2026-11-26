import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  body: { gap: spacing.space16 },
  rows: { gap: spacing.space12 },
  footer: { gap: spacing.space12 },
  track: { height: 6, borderRadius: radius.circle, backgroundColor: colors.action.secondary, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.circle, backgroundColor: colors.action.primary },
}));
