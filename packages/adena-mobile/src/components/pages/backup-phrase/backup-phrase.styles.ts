import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  card: {
    gap: spacing.space16,
    padding: spacing.space16,
    borderRadius: radius.surface,
    backgroundColor: colors.background.subtle,
  },
  cardLabel: { fontSize: 14 },
}));
