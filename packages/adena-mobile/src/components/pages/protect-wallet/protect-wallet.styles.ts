import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  hero: { alignItems: 'center', gap: spacing.space16, marginTop: spacing.space12, marginBottom: spacing.space24 },
  badge: {
    width: 96,
    height: 96,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.subtle,
  },
}));
