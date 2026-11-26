import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  root: { gap: spacing.space8 },
  amounts: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.space4 },
  track: { height: 6, borderRadius: radius.circle, backgroundColor: colors.action.secondary, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.circle, backgroundColor: colors.action.primary },
}));
