import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  masked: {
    alignItems: 'center',
    gap: spacing.space12,
    padding: spacing.space16,
    borderRadius: radius.smallControl,
    backgroundColor: colors.background.subtle,
  },
}));
