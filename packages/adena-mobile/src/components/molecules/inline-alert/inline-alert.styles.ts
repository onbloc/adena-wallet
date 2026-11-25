import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  box: {
    flexDirection: 'row',
    gap: spacing.space12,
    padding: spacing.space12,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.surface,
  },
  texts: { flex: 1, gap: 2 },
}));
