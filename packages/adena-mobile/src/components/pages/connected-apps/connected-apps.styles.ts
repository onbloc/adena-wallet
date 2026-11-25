import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  intro: { gap: spacing.space8 },
  list: { gap: spacing.space8 },
  card: { borderRadius: radius.input, backgroundColor: colors.background.subtle, padding: spacing.space16, gap: spacing.space12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12 },
  texts: { flex: 1, gap: 2 },
}));
