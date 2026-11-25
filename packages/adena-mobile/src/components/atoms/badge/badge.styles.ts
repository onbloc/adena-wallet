import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.space4,
    paddingHorizontal: spacing.space8,
    paddingVertical: 2,
    borderRadius: radius.circle,
    backgroundColor: colors.background.subtle,
  },
  dot: { width: 6, height: 6, borderRadius: radius.circle },
}));
